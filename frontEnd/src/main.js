// main.js
import { loginAnonymously } from './services/authService.js';
import { saveDailyData, getDailyData } from './services/healthService.js'; 

// アプリ全体で「今何日を選択しているか」を記憶する変数
let currentDate = new Date(); 

// 曜日を日本語に変換するための配列
const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * 各カードのリンク（href）に選択された日付パラメータを付与する関数
 */
function updateNavigationLinks(dateStr) {
    const mealLink = document.getElementById("link-meal");
    const sleepLink = document.getElementById("link-sleep");
    const walkLink = document.getElementById("link-walk");

    if (mealLink) mealLink.setAttribute("href", `../../mealApp.html?date=${dateStr}`);
    if (sleepLink) sleepLink.setAttribute("href", `../../SleepApp.html?date=${dateStr}`);
    if (walkLink) walkLink.setAttribute("href", `../../walk.html?date=${dateStr}`);
    console.log(`🔗 リンクの日付を更新しました: ${dateStr}`);
}

/**
 * Firestoreから取得したデータを画面の各カードに反映させる関数
 */
function updateCardContents(data) {
    // 1. 食事カードの書き換え
    const mealCardContent = document.querySelector('.card.meal .card-content');
    if (mealCardContent) {
        //
        if (data && data.meal) {//開始時刻・献立・栄養素の全てが入力されてないと食事を「済」にしない。
            //それぞれの食事で、開始時刻が入力されてるかどうか判定する関数。全て入力されてたらtrueを返す。
            function isMealComplete(meal) {
                if(meal.menu != "" && meal.time != "" && meal.nutrients != ""){
                    return true;
                }
                return false;//どれか1つでも入力されてなかったらfalseを返す。
            }
            const breakfastStatus = isMealComplete(data.meal.breakfast) ? "済" : "未";
            const lunchStatus = isMealComplete(data.meal.lunch) ? "済" : "未";
            const dinnerStatus = isMealComplete(data.meal.dinner) ? "済" : "未";

            mealCardContent.innerHTML = `
                <p>朝：${breakfastStatus}</p>
                <p>昼：${lunchStatus}</p>
                <p>晩：${dinnerStatus}</p>
            `;
        } else {
            mealCardContent.innerHTML = ` <p>朝：未</p><p>昼：未</p><p>晩：未</p> `;
        }
    }

    // 2. 睡眠カードの書き換え
    const sleepValue = document.querySelector('.card.sleep .value');
    if (sleepValue) {
        if (data && data.sleep) {
            const hour = data.sleep.hour ?? 0;
            const minute = data.sleep.minute ?? 0;
            sleepValue.textContent = `${hour}時間${minute}分`;
        } else {
            sleepValue.textContent = "00時間00分";
        }
    }

    // 3. 歩数カードの書き換え
    const stepsValue = document.querySelector('.card.steps .value');
    if (stepsValue) {
        if (data && data.walk !== undefined && data.walk !== null) {
            stepsValue.textContent = `${Number(data.walk).toLocaleString()}歩`;
        } else {
            stepsValue.textContent = "0歩";
        }
    }

    // 4. コンディションカードの書き換え
    if (data && data.condition !== undefined) {
        const savedCondition = data.condition;
        const targetRadio = document.getElementById(`cond-${savedCondition}`);
        if (targetRadio) {
            targetRadio.checked = true;
        }
    } else {
        for (let i = 1; i <= 5; i++) {
            const radioBtn = document.getElementById(`cond-${i}`);
            if (radioBtn) radioBtn.checked = false;
        }
    }
}

// カレンダー自動生成ロジック
function renderCalendar() {
    const calendarBody = document.getElementById('calendar-body');
    if (!calendarBody) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfThisMonth = new Date(year, month, 1).getDay(); 
    const lastDateOfThisMonth = new Date(year, month + 1, 0).getDate(); 
    const lastDateOfLastMonth = new Date(year, month, 0).getDate(); 

    let html = '';
    let dateCount = 1;
    let nextMonthDateCount = 1;

    for (let i = 0; i < 6; i++) {
        html += '<tr>';
        for (let j = 0; j < 7; j++) {
            if (i === 0 && j < firstDayOfThisMonth) {
                const lastMonthDate = lastDateOfLastMonth - firstDayOfThisMonth + j + 1;
                html += `<td class="other-month">${lastMonthDate}</td>`;
            } else if (dateCount > lastDateOfThisMonth) {
                html += `<td class="other-month">${nextMonthDateCount}</td>`;
                nextMonthDateCount++;
            } else {
                const isSelectedDay = (dateCount === currentDate.getDate());
                const className = isSelectedDay ? 'class="today"' : '';
                
                html += `<td ${className}>${dateCount}</td>`;
                dateCount++;
            }
        }
        html += '</tr>';
        if (dateCount > lastDateOfThisMonth && nextMonthDateCount > 1) {
            break;
        }
    }

    calendarBody.innerHTML = html;
    setupCalendarCellsEvent();
}

// カレンダーのマス目クリックイベント
function setupCalendarCellsEvent() {
    const calendarCells = document.querySelectorAll('.calendar tbody td');
    calendarCells.forEach(cell => {
        if (cell.classList.contains('other-month')) return; 
        
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', () => {
            const clickedDay = parseInt(cell.textContent, 10);
            if (!isNaN(clickedDay)) {
                console.log(`カレンダーの ${clickedDay} 日がクリックされました`);
                currentDate.setDate(clickedDay);
                updateDateDisplay(); // 画面更新＆データ再取得＆リンク更新
            }
        });
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

    const dateDisplay = document.querySelector('.current-date');
    if (dateDisplay) {
        dateDisplay.textContent = `${year}/${month}/${date}（${day}）`;
    }

    renderCalendar();

    const dateStr = `${year}-${month}-${date}`;
    console.log(`📅 ${dateStr} のデータを取得します...`);

    // 💡 重要：日付が変わったら、即座に遷移先のリンクURLも更新する
    updateNavigationLinks(dateStr);

    try {
        const firebaseData = await getDailyData(dateStr);
        updateCardContents(firebaseData);
    } catch (error) {
        console.error("データ自動取得エラー:", error);
    }
}

/**
 * カレンダーの左右矢印ボタンにクリックイベントを設定する関数
 */
function setupCalendarNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    if (navButtons.length >= 2) {
        const prevBtn = navButtons[0];
        const nextBtn = navButtons[1];

        prevBtn.addEventListener('click', () => {
            currentDate.setDate(currentDate.getDate() - 1);
            updateDateDisplay();
        });

        nextBtn.addEventListener('click', () => {
            currentDate.setDate(currentDate.getDate() + 1);
            updateDateDisplay();
        });
        
        console.log("✅ カレンダー矢印ボタンの設定が完了しました");
    }
}

// アプリの初期化
async function initApp() {
    try {
        const user = await loginAnonymously();
        if (user) {
            console.log("🔥 Firebase接続成功！ UID:", user.uid);

            // 他のアプリから戻ってきたときにパラメータがあれば日付を復元する
            const urlParams = new URLSearchParams(window.location.search);
            const paramDate = urlParams.get('date');

            if (paramDate) {
                const parsedDate = new Date(paramDate);
                if (!isNaN(parsedDate.getTime())) {
                    currentDate = parsedDate;
                    console.log(`[初期化] パラメータから日付を復元しました: ${paramDate}`);
                }
            }
            
            setupCalendarNavigation(); // ◀︎ ▶︎ ボタンの有効化
            await updateDateDisplay();  // カレンダー描画、Firestore取得、リンク生成の全初期化
        }
    } catch (error) {
        console.error("❌ 初期化エラーが発生しました:", error);
    }
}

// アプリ起動
initApp();

// 体調ボタンの自動保存設定
document.addEventListener("DOMContentLoaded", () => {
    for (let i = 1; i <= 5; i++) {
        const radioBtn = document.getElementById(`cond-${i}`);
        if (radioBtn) {
            radioBtn.addEventListener("change", async () => {
                const yyyy = currentDate.getFullYear();
                const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
                const dd = String(currentDate.getDate()).padStart(2, '0');
                const dateStr = `${yyyy}-${mm}-${dd}`;

                try {
                    const conditionData = { condition: i };
                    await saveDailyData(dateStr, conditionData);
                    console.log(`[Firestore] ${dateStr} の体調を ${i} に保存しました。`);
                } catch (error) {
                    console.error("❌ 体調の保存に失敗しました:", error);
                }
            });
        }
    }
});