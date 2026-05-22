// mealApp.js
import { saveDailyData } from '../services/healthService.js';

// 🌟 URLの末尾（?date=2026-05-19）から選択された日付を自動キャッチ
const urlParams = new URLSearchParams(window.location.search);
const targetDate = urlParams.get('date') || new Date().toISOString().split('T')[0];

// HTML上の日付テキストエリアを、選択された日付に書き換える（初期化処理）
document.addEventListener('DOMContentLoaded', () => {
    const dateDisplay = document.getElementById('date');
    if (dateDisplay) {
        dateDisplay.textContent = `選択された日付: ${targetDate.replace(/-/g, '/')}`;
    }
});

// 「1日の記録を終了して確定する」ボタンが押されたときの保存イベント
document.getElementById('finish_today_btn').addEventListener('click', async () => {
    try {
        // 画面の入力フィールドから値を回収
        const mealData = {
            meal: {
                breakfast: {
                    menu: document.getElementById('breakfast_menu').value || "",
                    time: document.getElementById('breakfast_really_time').value || ""
                },
                lunch: {
                    menu: document.getElementById('lunch_menu').value || "",
                    time: document.getElementById('lunch_really_time').value || ""
                },
                dinner: {
                    menu: document.getElementById('dinner_menu').value || "",
                    time: document.getElementById('dinner_really_time').value || ""
                }
            }
        };

        // 新しい安全な上書き保存関数を実行
        await saveDailyData(targetDate, mealData);
        alert(`✅ ${targetDate} の食事記録を保存しました！`);
        
        // 保存後、自動でホーム画面に戻る場合は以下を有効にしてください
        // window.location.href = 'index.html';
    } catch (error) {
        console.error("食事データの保存に失敗しました:", error);
        alert("エラーが発生しました。コンソールを確認してください。");
    }
});