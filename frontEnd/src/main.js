// main.js
import { loginAnonymously } from './services/authService.js';
import { saveDailyData, getDailyData } from './services/healthService.js'; // ★追加

// アプリ全体で「今何日を選択しているか」を記憶する変数
// 💡 JavaScriptの月は 0 から始まる
let currentDate = new Date(); 

// 曜日を日本語に変換するための配列
const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * Firestoreから取得したデータを画面の各カードに反映させる関数
 * @param {Object} data - Firestoreから取得した1日分のデータオブジェクト
 */
function updateCardContents(data) {
    // 1. 食事カードの書き換え
    const mealCardContent = document.querySelector('.card.meal .card-content');
    if (mealCardContent) {
        // data.meal が存在し、さらに data.meal.breakfast が存在するかを「?.」で安全に確認します
        if (data && data.meal) {
            const breakfastStatus = data.meal.breakfast?.menu ? "済" : "未";
            const lunchStatus = data.meal.lunch?.menu ? "済" : "未";
            const dinnerStatus = data.meal.dinner?.menu ? "済" : "未";
            
            mealCardContent.innerHTML = `
                <p>朝：${breakfastStatus}</p>
                <p>昼：${lunchStatus}</p>
                <p>晩：${dinnerStatus}</p>
            `;
        } else {
            mealCardContent.innerHTML = `
                <p>朝：未</p>
                <p>昼：未</p>
                <p>晩：未</p>
            `;
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
        if (data && data.walk !== undefined) {
            stepsValue.textContent = `${Number(data.walk).toLocaleString()}歩`;
        } else {
            stepsValue.textContent = "0歩";
        }
    }
}

// 月ごとに曜日が合うようにカレンダーを自動生成するロジック
function renderCalendar() {
    const calendarBody = document.getElementById('calendar-body');
    if (!calendarBody) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0 = 1月, 4 = 5月...
    
    // 今月の1日が何曜日か (0:日 〜 6:土)、今月の末日が何日かを取得
    const firstDayOfThisMonth = new Date(year, month, 1).getDay(); 
    const lastDateOfThisMonth = new Date(year, month + 1, 0).getDate(); 
    const lastDateOfLastMonth = new Date(year, month, 0).getDate(); 

    let html = '';
    let dateCount = 1;
    let nextMonthDateCount = 1;

    for (let i = 0; i < 6; i++) { // 最大6週間分ループ
        html += '<tr>';
        for (let j = 0; j < 7; j++) {
            if (i === 0 && j < firstDayOfThisMonth) {
                // ① 先月の薄い数字のエリア
                const lastMonthDate = lastDateOfLastMonth - firstDayOfThisMonth + j + 1;
                html += `<td class="other-month">${lastMonthDate}</td>`;
            } else if (dateCount > lastDateOfThisMonth) {
                // ② 来月の薄い数字のエリア
                html += `<td class="other-month">${nextMonthDateCount}</td>`;
                nextMonthDateCount++;
            } else {
                // ③ 今月の数字エリア（選択されている日なら「today」クラスを付与）
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

    // 組み立てたHTMLをインジェクション
    calendarBody.innerHTML = html;

    // 生まれたての新しいマス目にクリックイベントを設定
    setupCalendarCellsEvent();
}

//自動生成されたカレンダーのマス目にクリックイベントをつける関数
function setupCalendarCellsEvent() {
    const calendarCells = document.querySelectorAll('.calendar tbody td');
    calendarCells.forEach(cell => {
        if (cell.classList.contains('other-month')) return; // 先月・来月はクリック無視
        
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', () => {
            const clickedDay = parseInt(cell.textContent, 10);
            if (!isNaN(clickedDay)) {
                console.log(`カレンダーの ${clickedDay} 日がクリックされました`);
                currentDate.setDate(clickedDay);
                updateDateDisplay(); // 画面更新＆データ再取得
            }
        });
    });
}

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

        updateCardContents(firebaseData);//取得したデータをカードに反映させる関数を呼び出す

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
    const mealCard = document.querySelector('.card.meal');
    const sleepCard = document.querySelector('.card.sleep');
    const stepsCard = document.querySelector('.card.steps');

    // 「2026-05-19」のような日付形式の文字列を取得する共通関数
    const getFormattedDate = () => {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const date = String(currentDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${date}`;
    };

    if (mealCard) {
        mealCard.addEventListener('click', () => {
            // URLの末尾に ?date=2026-05-19 を付与して遷移
            window.location.href = `../../mealApp.html?date=${getFormattedDate()}`;
        });
    }

    if (sleepCard) {
        sleepCard.addEventListener('click', () => {
            window.location.href = `../../SleepApp.html?date=${getFormattedDate()}`;
        });
    }

    if (stepsCard) {
        stepsCard.addEventListener('click', () => {
            window.location.href = `../../walk.html?date=${getFormattedDate()}`;
        });
    }
    console.log("✅ 日付パラメータ付き画面遷移の設定が完了しました");
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
                // 食事データ（階層構造）
                meal: {
                    breakfast: {
                        menu: "テスト用のトースト",
                        time: "08:30"
                    },
                    lunch: {
                        menu: "",
                        time: ""
                    },
                    dinner: {
                        menu: "",
                        time: ""
                    }
                },
                // 睡眠データ（階層構造）
                sleep: {
                    hour: 7,
                    minute: 15,
                    waketime: "07:00",
                    sleeptime: "23:45"//自動計算で出す就寝時間
                },
                // 歩数データ
                walk: 8000,
                // 目標歩数
                walkTarget: 5000
            });
            console.log("✅ Firestoreへの書き込みに成功しました！");
        }
    } catch (error) {
        console.error("❌ エラーが発生しました:", error);
    }
}

initApp();