// main.js
import { loginAnonymously } from './services/authService.js';
import { saveDailyData } from './services/healthService.js'; // ★追加

async function initApp() {
    try {
        const user = await loginAnonymously();
        if (user) {
            console.log("🔥 Firebase接続成功！ UID:", user.uid);

            // ★書き込みテスト（疎通確認）を追加
            console.log("テストデータを送信中...");
            await saveDailyData("2026-05-12", {
                breakfastMenu: "テスト用のトースト",
                breakfastTime: "08:30",
                sleepHour: 7,
                sleepMinute: 15,
                walkSteps: 8000
            });
            console.log("✅ Firestoreへの書き込みに成功しました！");
        }
    } catch (error) {
        console.error("❌ エラーが発生しました:", error);
    }
}

initApp();