// main.js
import { loginAnonymously } from './services/authService.js';
import { saveDailyData } from './services/healthService.js'; // ★追加

function setupCardNavigation() {
    // 1. 各カードの要素（ボタン代わり）をHTMLから探す
    const mealCard = document.querySelector('.card.meal');
    const sleepCard = document.querySelector('.card.sleep');
    const stepsCard = document.querySelector('.card.steps');

    // 2. 食事カードがクリックされたら、食事画面（meal.html）へ移動
    if (mealCard) {
        mealCard.addEventListener('click', () => {
            console.log("食事画面へ遷移します");
            window.location.href = './frontEnd/src/mealApp.html'; 
        });
    }

    // 3. 睡眠カードがクリックされたら、睡眠画面（sleep.html）へ移動
    if (sleepCard) {
        sleepCard.addEventListener('click', () => {
            console.log("睡眠画面へ遷移します");
            window.location.href = './frontEnd/src/SleepApp.html'; 
        });
    }

    // 4. 歩数カードがクリックされたら、歩数画面（steps.html）へ移動
    if (stepsCard) {
        stepsCard.addEventListener('click', () => {
            console.log("歩数画面へ遷移します");
            window.location.href = './frontEnd/src/walk.html'; 
        });
    }
}

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