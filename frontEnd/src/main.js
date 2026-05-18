// main.js
import { loginAnonymously } from './services/authService.js';
import { saveDailyData, getDailyData } from './services/healthService.js'; // ★追加

// アプリ全体で「今何日を選択しているか」を記憶する変数（初期値：2026年5月15日）
// 💡 JavaScriptの月は 0 から始まるので、4 = 5月 です
let currentDate = new Date(2026, 4, 15); 

// 曜日を日本語に変換するための配列
const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * カレンダーの青いハイライト（todayクラス）を現在の選択日に移動させる関数
 */
function updateCalendarHighlight() {
    // 1. まず、現在カレンダー内のどこかに付いている「today」クラスをすべて消去する
    const allCells = document.querySelectorAll('.calendar tbody td');
    allCells.forEach(cell => cell.classList.remove('today'));

    // 2. 現在選択されている「日」（例: 16）の数字を取得
    const currentDayStr = String(currentDate.getDate());

    // 3. カレンダーのマス目をループして、同じ数字のマス（ただし先月の薄い数字は除く）に「today」を付与する
    allCells.forEach(cell => {
        if (!cell.classList.contains('other-month') && cell.textContent === currentDayStr) {
            cell.classList.add('today'); // 🌟 これで青い背景がここに移動します！
        }
    });
}

/**
 * 画面の日付表示を更新し、その日のデータを読み込む関数
 */
async function updateDateDisplay() {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const date = String(currentDate.getDate()).padStart(2, '0');
    const day = weekDays[currentDate.getDay()];

    // HTML上の <h2 class="current-date"> を書き換える
    // 💡 フロントの方が作ったHTMLにはidがないため、クラス名で探します
    const dateDisplay = document.querySelector('.current-date');
    if (dateDisplay) {
        dateDisplay.textContent = `${year}/${month}/${date}（${day}）`;
    }

    // 🌟 追記：画面上の青いマス目の位置を更新する
    updateCalendarHighlight();

    // 🌟 バックエンドの超重要処理：
    // 日付が切り替わったら、その日のデータをFirestoreから自動取得する
    const dateStr = `${year}-${month}-${date}`;
    console.log(`📅 ${dateStr} のデータを取得します...`);
    try {
        const firebaseData = await getDailyData(dateStr);
        if (firebaseData) {
            console.log("選択された日のデータ:", firebaseData);
            // 💡 ここに、取得したデータを画面のカード（食事・歩数など）に
            // 反映させる処理（フロントへの引き渡し）を今後追記していきます！
        }
    } catch (error) {
        console.error("データ自動取得エラー:", error);
    }
}

/**
 * カレンダーの左右ボタンにクリックイベントを設定する関数
 */
function setupCalendarNavigation() {
    // フロントの方が作った「◀︎」「▶︎」ボタンは class="nav-btn" が2つ並んでいる状態です
    const navButtons = document.querySelectorAll('.nav-btn');
    
    if (navButtons.length >= 2) {
        const prevBtn = navButtons[0]; // 1つ目のボタン（◀︎）
        const nextBtn = navButtons[1]; // 2つ目のボタン（▶︎）

        // 「◀︎」ボタンが押されたら1日戻す
        prevBtn.addEventListener('click', () => {
            currentDate.setDate(currentDate.getDate() - 1);
            updateDateDisplay();
        });

        // 「▶︎」ボタンが押されたら1日進める
        nextBtn.addEventListener('click', () => {
            currentDate.setDate(currentDate.getDate() + 1);
            updateDateDisplay();
        });
        
        console.log("✅ カレンダーボタンの連動が完了しました");
    } else {
        console.warn("⚠ カレンダーのボタン（.nav-btn）が見つかりません");
    }

    // カレンダー内のすべての「日（tdタグ）」を取得します
    const calendarCells = document.querySelectorAll('.calendar tbody td');

    calendarCells.forEach(cell => {
        cell.addEventListener('click', () => {
            // 先月の薄い数字（other-monthクラス）はクリックしても無視する
            if (cell.classList.contains('other-month')) return;

            // マス目の数字（"16" など）を取得して数値に変換
            const clickedDay = parseInt(cell.textContent, 10);

            if (!isNaN(clickedDay)) {
                console.log(`カレンダーの ${clickedDay} 日がクリックされました`);
                
                // 「日」だけをクリックされた数字に書き換える
                currentDate.setDate(clickedDay);
                
                // 画面表示を更新し、裏側でFirebaseからデータを自動取得する
                updateDateDisplay();
            }
        });
        
        // マウスを乗せた時に「押せる」とわかるように矢印を手のマークに変える
        cell.style.cursor = 'pointer';
    });
}

function setupCardNavigation() {
    // 1. 各カードの要素（ボタン代わり）をHTMLから探す
    const mealCard = document.querySelector('.card.meal');
    const sleepCard = document.querySelector('.card.sleep');
    const stepsCard = document.querySelector('.card.steps');

    // 2. 食事カードがクリックされたら、食事画面（meal.html）へ移動
    if (mealCard) {
        mealCard.addEventListener('click', () => {
            console.log("食事画面へ遷移します");
            window.location.href = '../../mealApp.html';
        });
    }

    // 3. 睡眠カードがクリックされたら、睡眠画面（sleep.html）へ移動
    if (sleepCard) {
        sleepCard.addEventListener('click', () => {
            console.log("睡眠画面へ遷移します");
            window.location.href = '../../SleepApp.html';
        });
    }

    // 4. 歩数カードがクリックされたら、歩数画面（steps.html）へ移動
    if (stepsCard) {
        stepsCard.addEventListener('click', () => {
            console.log("歩数画面へ遷移します");
            window.location.href = '../../walk.html';
        });
    }
}

async function initApp() {
    try {
        const user = await loginAnonymously();
        if (user) {
            console.log("🔥 Firebase接続成功！ UID:", user.uid);

            setupCalendarNavigation();//カレンダー

            await updateDateDisplay();//日付表示とデータ自動取得

            setupCardNavigation();//画面遷移

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