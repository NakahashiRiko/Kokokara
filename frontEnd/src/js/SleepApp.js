// SleepApp.js
import { saveDailyData, getDailyData } from '../services/healthService.js';
import { loginAnonymously } from '../services/authService.js';

// URLから日付を自動キャッチ（なければ本日の日付）
const urlParams = new URLSearchParams(window.location.search);
const targetDate = urlParams.get('date') || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];//日本時間

// 画面が読み込まれた時の処理
document.addEventListener('DOMContentLoaded', async () => {
    // 1. ヘッダーの日付表示を更新
    const todayDateEl = document.getElementById("todayDate");
    if (todayDateEl) {
        todayDateEl.textContent = `対象日: ${targetDate.replace(/-/g, '/')}`;
    }

    // 2. 左上の「＜」ボタンの戻り先をセット
    const backBtn = document.querySelector('.back-button');
    if (backBtn) {
        backBtn.setAttribute('href', `frontEnd/src/index.html?date=${targetDate}`);
    }

    // 3. まずは匿名ログインを実行して、認証を完了させる
    try {
        const user = await loginAnonymously();
        if (user) {
            console.log("🔥 睡眠画面でのFirebase接続成功！ UID:", user.uid);
            
            // 4. ログインが成功した後に、既存データをFirestoreから読み込んで復元
            await loadExistingSleepData();
        }
    } catch (error) {
        console.error("❌ 睡眠画面でのログイン、またはデータ復元に失敗しました:", error);
    }
});

/**
 * HTML側の古い calculateSleep を横からキャッチして、
 * 計算処理が終わった直後にFirestoreへ保存する仕組み（フック）
 */
// HTML側の元の関数を変数に退避させる
const originalCalculateSleep = window.calculateSleep;

// window.calculateSleep を新しく作り直して上書きする
window.calculateSleep = async function() {
    
    // 1. まずHTML側に書かれている元の計算やアドバイス表示、グラフ更新をそのまま実行
    if (typeof originalCalculateSleep === 'function') {
        originalCalculateSleep();
    } else {
        // もしHTML側にまだ関数が読み込まれていなければ、HTML内の計算ロジックをここで実行
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
                hour: hours,         // main.jsのデータ構造に統一
                minute: minutes,
                waketime: wake,      // 小文字
                sleeptime: sleep     // 小文字
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
 * Firestoreからデータを読み込んでフォームに復元する関数
 */
async function loadExistingSleepData() {
    try {
        const data = await getDailyData(targetDate);
        if (data && data.sleep) {
            const sleep = data.sleep;

            // 入力フォームの値を復元 (main.js側の名前に合わせる)
            if (sleep.sleeptime) document.getElementById("sleepInput").value = sleep.sleeptime;
            if (sleep.waketime) document.getElementById("wakeInput").value = sleep.waketime;

            // 計算結果テキストとコメントの復元
            if (sleep.hour !== undefined && sleep.minute !== undefined) {
                const h = String(sleep.hour).padStart(2, '0');
                const m = String(sleep.minute).padStart(2, '0');
                
                document.getElementById("sleepResult").textContent = `${h}時間${m}分`;
                document.getElementById("comment").textContent = `今日の睡眠時間は${h}時間${m}分です。`;
            }
        }
    } catch (error) {
        console.error("❌ 睡眠データの読み込みに失敗しました:", error);
    }
}