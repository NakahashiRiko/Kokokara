// SleepApp.js
import { saveDailyData, getDailyData } from '../services/healthService.js';

// URLから日付を自動キャッチ（なければ本日の日付）
const urlParams = new URLSearchParams(window.location.search);
const targetDate = urlParams.get('date') || new Date().toISOString().split('T')[0];

// 画面が読み込まれた時の初期化処理
document.addEventListener('DOMContentLoaded', async () => {
    // 1. ヘッダーの日付表示を更新
    const todayDateEl = document.getElementById("todayDate");
    if (todayDateEl) {
        todayDateEl.textContent = `対象日: ${targetDate.replace(/-/g, '/')}`;
    }

    // 2.既存データを読込・復元する
    await loadExistingSleepData();

    // 3.ボタンのクリックイベントを設定
    const saveBtn = document.getElementById("saveSleepButton");
    if (saveBtn) {
        saveBtn.addEventListener('click', calculateAndSaveSleep);
    }

    // 4.左上の「＜」ボタンの戻り先を動的にセット
    const backBtn = document.querySelector('.back-button');
    if (backBtn) {
        backBtn.setAttribute('href', `frontEnd/src/index.html?date=${targetDate}`);
    }
});

/**
 * 睡眠時間を計算し、Firestoreに保存してホームへ戻る関数
 */
async function calculateAndSaveSleep() {
    const sleep = document.getElementById("sleepInput").value;
    const wake = document.getElementById("wakeInput").value;

    if (sleep === "" || wake === "") {
        alert("時間を入力してください");
        return;
    }

    let sleepHour = parseInt(sleep.split(":")[0]);
    let sleepMinute = parseInt(sleep.split(":")[1]);
    let wakeHour = parseInt(wake.split(":")[0]);
    let wakeMinute = parseInt(wake.split(":")[1]);

    let sleepTotal = sleepHour * 60 + sleepMinute;
    let wakeTotal = wakeHour * 60 + wakeMinute;

    if (wakeTotal < sleepTotal) {
        wakeTotal += 24 * 60; // 日をまたぐ場合の計算
    }

    const diff = wakeTotal - sleepTotal;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;

    // 画面のテキストを即時書き換え
    document.getElementById("sleepResult").textContent = `${String(hours).padStart(2, '0')}時間${String(minutes).padStart(2, '0')}分`;
    document.getElementById("comment").textContent = `今日の睡眠時間は${String(hours).padStart(2, '0')}時間${String(minutes).padStart(2, '0')}分です。`;

    // グラフ用データ（既存のフロントエンドのグローバル関数・配列がある場合のみ実行）
    if (typeof sleepData !== 'undefined' && typeof sleepChart !== 'undefined') {
        const today = new Date(targetDate).getDay();
        sleepData[today] = diff / 60;
        sleepChart.update();
        if (typeof calculateAverage === 'function') calculateAverage();
    }

    // Firestoreへデータを保存
    try {
        const sleepDataObj = {
            sleep: {
                hour: hours,         // main.jsの表記に合わせた階層構造
                minute: minutes,
                waketime: wake,      // 小文字に統一
                sleeptime: sleep     // 小文字に統一
            }
        };

        await saveDailyData(targetDate, sleepDataObj);
        alert(`✅ ${targetDate} の睡眠データを保存しました！`);

        // 保存が成功したら、日付を引き継いでホーム画面に戻る（相対パス）
        window.location.href = `frontEnd/src/index.html?date=${targetDate}`;

    } catch (error) {
        console.error("❌ 睡眠データの自動保存に失敗しました:", error);
        alert("保存に失敗しました。コンソールを確認してください。");
    }
}

/**
 * Firestoreからデータを読み込んでフォームに復元する関数
 */
async function loadExistingSleepData() {
    try {
        const data = await getDailyData(targetDate);
        if (data && data.sleep) {
            const sleep = data.sleep;

            // 入力フォームの値を復元 (プロパティ名をmain.jsと統一)
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