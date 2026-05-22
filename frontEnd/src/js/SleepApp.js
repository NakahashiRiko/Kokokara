// SleepApp.js
import { saveDailyData } from '../services/healthService.js';

// 🌟 URLから日付を自動キャッチして、画面の左上のテキストを上書き
const urlParams = new URLSearchParams(window.location.search);
const targetDate = urlParams.get('date') || new Date().toISOString().split('T')[0];

// HTML内の既存の「日付表示」エリアを上書き（元のnew Date()の固定表示を置き換え）
document.getElementById("todayDate").textContent = `対象日: ${targetDate.replace(/-/g, '/')}`;

/**
 * 💡 元々HTMLの<script>内にあった calculateSleep() 関数を
 * モジュールとして再定義し、最後にFirestore保存を追加します
 */
window.calculateSleep = async function() {
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
        wakeTotal += 24 * 60;
    }

    const diff = wakeTotal - sleepTotal;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;

    // 画面のUI書き換え（既存の処理）
    document.getElementById("sleepResult").textContent =
        `${String(hours).padStart(2,'0')}時間${String(minutes).padStart(2,'0')}分`;
    document.getElementById("comment").textContent =
        `今日の睡眠時間は${String(hours).padStart(2,'0')}時間${String(minutes).padStart(2,'0')}分です。`;

    // グラフ更新処理（既存の処理）
    const today = new Date().getDay();
    sleepData[today] = diff / 60;
    sleepChart.update();
    calculateAverage();

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🌟 バックエンド追加：計算された確定データをFirestoreに自動送信！
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    try {
        const sleepDataObj = {
            sleep: {
                totalHours: hours,        // 寝た合計時間（時間）
                totalMinutes: minutes,    // 寝た合計時間（分）
                wakeTime: wake,           // 起床時間（例 "06:30"）
                sleepTime: sleep          // 就寝時間（例 "23:15"）
            }
        };

        await saveDailyData(targetDate, sleepDataObj);
        console.log(`[Firestore] ${targetDate} の睡眠データを自動保存しました`);
    } catch (error) {
        console.error("睡眠データの保存エラー:", error);
    }
};