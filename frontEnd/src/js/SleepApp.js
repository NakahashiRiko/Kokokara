// SleepApp.js
import { saveDailyData, getDailyData } from '../services/healthService.js';
import { loginAnonymously } from '../services/authService.js';

// URLから日付を自動キャッチ（なければ日本時間の本日の日付）
const urlParams = new URLSearchParams(window.location.search);
const targetDate = urlParams.get('date') || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

// 画面が読み込まれた時の初期化処理
document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. HTML側の強力な「今日」の処理を完全に上書き・乗っ取る
    setTimeout(() => {
        const todayDateEl = document.getElementById("todayDate");
        if (todayDateEl) {
            todayDateEl.textContent = `対象日: ${targetDate.replace(/-/g, '/')}`;
        }
        
        if (window.selectedDate !== undefined) {
            window.selectedDate = targetDate;
        }
    }, 100);

    // 2.左上の「＜」ボタンの戻り先を動的にセット
    const backBtn = document.querySelector('.back-button');
    if (backBtn) {
        // 元の index.html へのパスに修正（環境に合わせて調整してください）
        backBtn.setAttribute('href', `index.html?date=${targetDate}`);
    }

    // 3.Firebase匿名ログインを実行
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
 * HTML側の「記録処理（currentStatus === 'finished'）」の後に 
 * Firestoreへ自動保存を割り込ませるためのフック
 */
const originalHandleSleepButton = window.handleSleepButton;

window.handleSleepButton = async function() {
    // 1. まずHTML側の元のボタン処理（タイマー開始・停止・計算）を実行
    if (typeof originalHandleSleepButton === 'function') {
        originalHandleSleepButton();
    }

    // 2. HTML側のステータスが "idle" に戻った瞬間（＝記録処理が正常に完了した時）にFirestoreに保存する
    if (window.currentStatus === "idle") {
        const wakeInput = document.getElementById("wakeInput");
        const bedTimeResult = document.getElementById("bedTimeResult").textContent;
        
        // HTML内のグローバル変数から計算済みの値を取得
        const totalMinutes = window.savedDiffMinutes || 0;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        try {
            const sleepDataObj = {
                sleep: {
                    hour: hours,         
                    minute: minutes,
                    waketime: wakeInput.value || "", // 記録直後は空になっている可能性があるので直前の値か空文字
                    bedtime: bedTimeResult          // 逆算された就寝時刻を保存
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
 * Firestoreからデータを読み込んでフォームと【グラフ】に復元する関数
 */
async function loadExistingSleepData() {
    try {
        const data = await getDailyData(targetDate);
        if (data && data.sleep) {
            const sleep = data.sleep;

            // 1. 起床時間と就寝時間のテキスト復元
            if (sleep.waketime) {
                // 起床時間インプットの復元（過去データ確認用）
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

                // 3. HTML側のグラフ用配列（sleepData）にデータを復元し、グラフを再描画
                if (window.sleepData && window.sleepChart) {
                    const selectedDateObj = new Date(targetDate);
                    const dayOfWeek = selectedDateObj.getDay(); // 0:日 〜 6:土

                    // グラフデータ配列に時間（小数点）をセット
                    window.sleepData[dayOfWeek] = Math.round(totalHours * 10) / 10;

                    // グラフ画面を最新の状態にリフレッシュ
                    window.sleepChart.update();

                    // 平均値計算ロジックを実行
                    if (typeof window.calculateAverage === 'function') {
                        window.calculateAverage();
                    }
                }
                
                // すでにデータがある場合は、ステータス表示を更新
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