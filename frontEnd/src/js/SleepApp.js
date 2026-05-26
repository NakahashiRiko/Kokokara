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
        // 対象日のテキスト表示を過去日に強制書き換え
        const todayDateEl = document.getElementById("todayDate");
        if (todayDateEl) {
            todayDateEl.textContent = `対象日: ${targetDate.replace(/-/g, '/')}`;
        }
        
        // HTML側のローカル変数 selectedDate のガードが外れている場合、ここでも同期をかける
        if (window.selectedDate !== undefined) {
            window.selectedDate = targetDate;
        }
    }, 100);

    // 2. 左上の「＜」ボタンの戻り先を動的にセット
    const backBtn = document.querySelector('.back-button');
    if (backBtn) {
        backBtn.setAttribute('href', `frontEnd/src/index.html?date=${targetDate}`);
    }

    // 3. Firebase匿名ログインを実行
    try {
        const user = await loginAnonymously();
        if (user) {
            console.log("🔥 睡眠画面でのFirebase接続成功！ UID:", user.uid);
            
            // 4. ログイン成功後に、既存データをFirestoreから読み込んでフォームと【グラフ】を復元
            await loadExistingSleepData();
        }
    } catch (error) {
        console.error("❌ Firebaseログインに失敗しました:", error);
    }
});

/**
 * HTML側のボタンが押されたら、
 * 計算処理を行った直後にFirestoreへ保存する仕組み
 */
const originalCalculateSleep = window.calculateSleep;

window.calculateSleep = async function() {
    
    // 1. まずHTML側に書かれている元の計算やアドバイス表示、グラフ更新をそのまま実行
    if (typeof originalCalculateSleep === 'function') {
        originalCalculateSleep();
    } else {
        const sleep = document.getElementById("sleepInput").value;
        const wake = document.getElementById("wakeInput").value;
        if (sleep === "" || wake === "") return;
        
        let sleepHour = parseInt(sleep.split(":")[0]);
        let sleepMinute = parseInt(sleep.split(":")[1]);
        let wakeHour = parseInt(wake.split(":")[0]);
        let wakeMinute = parseInt(wake.split(":")[1]);
        let sleepTotal = sleepHour * 60 + sleepMinute;
        let wakeTotal = wakeHour * 60 + wakeMinute;
        if (wakeTotal < sleepTotal) wakeTotal += 24 * 60;
        const diff = wakeTotal - sleepTotal;
        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;
        
        document.getElementById("sleepResult").textContent = `${String(hours).padStart(2, '0')}時間${String(minutes).padStart(2, '0')}分`;
    }

    // 2. 画面の入力欄から保存用のデータを回収
    const sleep = document.getElementById("sleepInput").value;
    const wake = document.getElementById("wakeInput").value;

    if (sleep === "" || wake === "") return;

    let sleepHour = parseInt(sleep.split(":")[0]);
    let sleepMinute = parseInt(sleep.split(":")[1]);
    let wakeHour = parseInt(wake.split(":")[0]);
    let wakeMinute = parseInt(wake.split(":")[1]);
    let sleepTotal = sleepHour * 60 + sleepMinute;
    let wakeTotal = wakeHour * 60 + wakeMinute;
    if (wakeTotal < sleepTotal) wakeTotal += 24 * 60;
    const diff = wakeTotal - sleepTotal;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;

    // 3. Firestoreへデータを自動保存
    try {
        const sleepDataObj = {
            sleep: {
                hour: hours,         
                minute: minutes,
                waketime: wake,      
                sleeptime: sleep     
            }
        };

        await saveDailyData(targetDate, sleepDataObj);
        alert(`✅ ${targetDate} の睡眠データを保存しました！`);

        // 保存が成功したらホーム画面に戻る
        window.location.href = `frontEnd/src/index.html?date=${targetDate}`;

    } catch (error) {
        console.error("❌ 睡眠データの自動保存に失敗しました:", error);
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

            // 入力フォームの値を復元
            if (sleep.sleeptime) document.getElementById("sleepInput").value = sleep.sleeptime;
            if (sleep.waketime) document.getElementById("wakeInput").value = sleep.waketime;

            // 計算結果テキストとコメントの復元
            if (sleep.hour !== undefined && sleep.minute !== undefined) {
                const h = String(sleep.hour).padStart(2, '0');
                const m = String(sleep.minute).padStart(2, '0');
                
                document.getElementById("sleepResult").textContent = `${h}時間${m}分`;
                
                let advice = "理想的な睡眠時間です。この生活リズムを維持しましょう。";
                const totalHours = sleep.hour + (sleep.minute / 60);
                if (totalHours < 6) {
                    advice = "睡眠時間が不足しています。十分な休息を取りましょう。";
                } else if (totalHours > 9) {
                    advice = "睡眠時間が長めです。生活リズムも意識してみましょう。";
                } else if (totalHours >= 6 && totalHours < 7) {
                    advice = "あと少し睡眠時間を増やすとより良いです。";
                }
                
                document.getElementById("comment").textContent = `今日の睡眠時間は${h}時間${m}分です。\n${advice}`;

                // HTML側のグラフ用配列（sleepData）にデータを復元し、グラフを再描画する
                if (window.sleepData && window.sleepChart) {
                    // targetDateから曜日（0:日 〜 6:土）を取得
                    const selectedDateObj = new Date(targetDate);
                    const dayOfWeek = selectedDateObj.getDay(); 

                    // グラフデータ配列の該当する曜日の位置に、今回の睡眠時間をセット（時間単位の少数点）
                    window.sleepData[dayOfWeek] = totalHours;

                    // グラフ画面を最新の状態にリフレッシュ（描画）
                    window.sleepChart.update();

                    // HTML側にある平均値計算ロジック（もし存在すれば）を実行
                    if (typeof window.calculateAverage === 'function') {
                        window.calculateAverage();
                    }
                }
            }
        }
    } catch (error) {
        console.error("❌ 睡眠データの読み込みに失敗しました:", error);
    }
}