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
            todayDateEl.textContent = `対象日: ${targetDate.replace(/-/g, '/')}`;
        }
    }, 100);

    // 2. 左上の「＜」ボタンの戻り先をセット
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
 * 🌟【超重要】HTML側の関数内の return に邪魔されない、最強のフック処理
 * HTML側の元の関数を一旦退避させ、JS側で「実行後」の処理を確実にコントロールします。
 */
if (typeof window.handleSleepButton === 'function') {
    // 元の関数をバックアップ
    const originalHandleSleepButton = window.handleSleepButton;

    // window.handleSleepButton を新しく作り直す
    window.handleSleepButton = async function() {
        // 記録ボタンを押す「直前」の、画面上の状態をキープ
        const wakeInput = document.getElementById("wakeInput");
        const preInputValue = wakeInput ? wakeInput.value : "";
        const btn = document.getElementById("button");
        
        // 今のモードが「記録する（finished）」の状態かどうかをチェックしておく
        const isRecordingMode = btn && btn.textContent === "記録する";

        // 1. HTML側の元の処理（タイマー計算、画面初期化、そして内部でのreturn）を実行
        originalHandleSleepButton();

        // 2. もしボタンが「記録する」の時に押され、かつ無事に初期化された場合
        // HTML側が途中で return しても、このJS側の関数は途切れません！
        if (isRecordingMode && btn && btn.textContent === "就寝する" && preInputValue !== "") {
            console.log("📝 記録完了を検知。Firestoreへの保存を開始します...");

            // 画面に表示された「〇〇時間〇〇分」から数字を逆算して抽出
            const sleepResultText = document.getElementById("sleepResult").textContent;
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
            const bedTimeResult = document.getElementById("bedTimeResult").textContent;

            try {
                // 保存用データオブジェクトの作成
                const sleepDataObj = {
                    sleep: {
                        hour: hours,         
                        minute: minutes,
                        waketime: preInputValue, // クリアされる前にキープした値
                        bedtime: bedTimeResult   // 逆算された就寝時刻
                    }
                };

                // Firestoreへ自動保存
                await saveDailyData(targetDate, sleepDataObj);
                
                // コメント（アラート）を表示
                alert(`✅ ${targetDate} の睡眠データを保存しました！`);

                // ホーム画面に戻る
                window.location.href = `index.html?date=${targetDate}`;

            } catch (error) {
                console.error("❌ 睡眠データの自動保存に失敗しました:", error);
                alert("データベースの保存に失敗しました。");
            }
        }
    };
}

/**
 * グラフを即時書き換える共通処理
 */
function updateLocalChart(totalHours) {
    const ctx = document.getElementById('sleepChart');
    if (ctx) {
        const chartInstance = Chart.getChart(ctx);
        if (chartInstance) {
            const selectedDateObj = new Date(targetDate);
            const dayOfWeek = selectedDateObj.getDay(); // 0:日 〜 6:土

            chartInstance.data.datasets[0].data[dayOfWeek] = Math.round(totalHours * 10) / 10;
            chartInstance.update();
        }
    }
}

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
                    commentEl.textContent = `今日の睡眠時間は${h}時間${m}分です。\n${advice}`;
                }

                // 3. 既存データがある場合のグラフ描画
                updateLocalChart(totalHours);
                
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