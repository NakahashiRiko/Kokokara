// SleepApp.js
import { saveDailyData, getDailyData } from '../services/healthService.js';
import { loginAnonymously } from '../services/authService.js';

// URLから日付を自動キャッチ（なければ日本時間の本日の日付）
const urlParams = new URLSearchParams(window.location.search);
const targetDate = urlParams.get('date') || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

// 画面が読み込まれた時の初期化処理
document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. HTML側の表示を今回の対象日に合わせる
    setTimeout(() => {
        const todayDateEl = document.getElementById("todayDate");
        if (todayDateEl) {
            // HTML側で最初に「対象日: YYYY/MM/DD」と入る仕様に合わせる
            todayDateEl.textContent = `対象日: ${targetDate.replace(/-/g, '/')}`;
        }
    }, 100);

    // 2. 左上の「＜」ボタンの戻り先を動的にセット
    const backBtn = document.querySelector('.back-button');
    if (backBtn) {
        backBtn.setAttribute('href', `index.html?date=${targetDate}`);
    }

    // 3. Firebase匿名ログインを実行
    try {
        const user = await loginAnonymously();
        if (user) {
            console.log("🔥 睡眠画面でのFirebase接続成功！ UID:", user.uid);
            
            // 4. 既存データをFirestoreから読み込んで復元
            await loadExistingSleepData();
        }
    } catch (error) {
        console.error("❌ Firebaseログインに失敗しました:", error);
    }
});

/**
 * HTML側の handleSleepButton をフックし、
 * HTML内部のローカル変数（diffMinutesなど）を確実に捕まえます。
 */
const originalHandleSleepButton = window.handleSleepButton;

window.handleSleepButton = async function() {
    // ボタンを押す前の起床入力欄の値をキープ
    const wakeInput = document.getElementById("wakeInput");
    const preInputValue = wakeInput ? wakeInput.value : "";

    // 1. HTML側の元の処理（タイマー停止、diffMinutesの計算など）を実行
    if (typeof originalHandleSleepButton === 'function') {
        originalHandleSleepButton();
    }

    // 2. HTML側で処理が完了して「idle」に戻ったかを判定
    if (window.currentStatus === "idle") {
        
        // HTML側で計算された「就寝時刻」のテキストを取得
        const bedTimeResult = document.getElementById("bedTimeResult").textContent;
        
        // HTML側の「diffMinutes（分）」をテキストから逆算、またはキープする
        // HTML側で「〇〇時間〇〇分」と表示された文字列から、合計分を安全に抽出します
        const sleepResultText = document.getElementById("sleepResult").textContent; // "07時間30分" のような形式
        let totalMinutes = 0;
        
        if (sleepResultText && sleepResultText.includes("時間")) {
            const match = sleepResultText.match(/(\d+)時間(\d+)分/);
            if (match) {
                const h = parseInt(match[1], 10);
                const m = parseInt(match[2], 10);
                totalMinutes = (h * 60) + m;
            }
        }

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        // 起床時間が空（HTML側でクリアされた後）なら、直前のキープ値を使う
        const finalWakeTime = wakeInput && wakeInput.value ? wakeInput.value : preInputValue;

        try {
            // 正しいオブジェクト構造でFirestoreに保存
            const sleepDataObj = {
                sleep: {
                    hour: hours,         
                    minute: minutes,
                    waketime: finalWakeTime, 
                    bedtime: bedTimeResult   
                }
            };

            await saveDailyData(targetDate, sleepDataObj);
            alert(`✅ ${targetDate} の睡眠データを保存しました！`);

            // 保存が成功したらホーム画面に戻る
            window.location.href = `index.html?date=${targetDate}`;

        } catch (error) {
            console.error("❌ 睡眠データの自動保存に失敗しました:", error);
        }
    }
};

/**
 * Firestoreからデータを読み込んでフォームとグラフに復元する関数
 */
async function loadExistingSleepData() {
    try {
        const data = await getDailyData(targetDate);
        if (data && data.sleep) {
            const sleep = data.sleep;

            // 1. 起床時間と就寝時間のテキスト復元
            if (sleep.waketime) {
                const wakeInput = document.getElementById("wakeInput");
                if (wakeInput) wakeInput.value = sleep.waketime;
            }
            
            if (sleep.bedtime) {
                const bedTimeEl = document.getElementById("bedTimeResult");
                if (bedTimeEl) bedTimeEl.textContent = sleep.bedtime;
            }

            // 2. 計算結果テキストとコメントの復元
            if (sleep.hour !== undefined && sleep.minute !== undefined) {
                const h = String(sleep.hour).padStart(2, '0');
                const m = String(sleep.minute).padStart(2, '0');
                
                const sleepResultEl = document.getElementById("sleepResult");
                if (sleepResultEl) sleepResultEl.textContent = `${h}時間${m}分`;
                
                // アドバイスの再生成
                let advice = "理想的な睡眠時間です。この生活リズムを維持しましょう。";
                const totalHours = sleep.hour + (sleep.minute / 60);
                if (totalHours < 6) {
                    advice = "睡眠時間が不足しています。十分な休息を取りましょう。";
                } else if (totalHours > 9) {
                    advice = "睡眠時間が長めです。生活リズムも意識してみましょう。";
                } else if (totalHours >= 6 && totalHours < 7) {
                    advice = "あと少し睡眠時間を増やすとより良いです。";
                }
                
                const commentEl = document.getElementById("comment");
                if (commentEl) {
                    commentEl.textContent = `今日の睡眠時間は ${h}時間${m}分です。\n${advice}`;
                }

                // 3. HTML側のグラフ用配列（sleepData）とグラフオブジェクト（sleepChart）へのデータ復元
                // window直下にない場合を考慮し、HTML側のスコープから Chart オブジェクトを探すか、
                // Chart.getChart を使ってCanvasから直接グラフインスタンスを引っ張って同期させます。
                const ctx = document.getElementById('sleepChart');
                if (ctx) {
                    const chartInstance = Chart.getChart(ctx); // Chart.js公式のインスタンス取得メソッド
                    if (chartInstance) {
                        const selectedDateObj = new Date(targetDate);
                        const dayOfWeek = selectedDateObj.getDay(); // 0:日 〜 6:土

                        // グラフのデータ配列に対象の睡眠時間をセット
                        chartInstance.data.datasets[0].data[dayOfWeek] = Math.round(totalHours * 10) / 10;
                        chartInstance.update(); // グラフを再描画
                    }
                }
                
                // 画面中央の状態表示を「記録済み」にする
                const statusDisplay = document.getElementById("statusDisplay");
                if (statusDisplay) {
                    statusDisplay.textContent = "本日の睡眠は記録済みです。";
                }
            }
        }
    } catch (error) {
        console.error("❌ 睡眠データの読み込みに失敗しました:", error);
    }
}