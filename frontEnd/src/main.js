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

    const memoInput = document.querySelector('.memo-input');
    if (memoInput) {
        if (data && data.memo !== undefined) {
            memoInput.value = data.memo; 
        } else {
            memoInput.value = ""; 
        }
    }
}

// カレンダー自動生成ロジック
async function renderCalendar() {
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
                const className = isSelectedDay ? 'today' : '';
                
                const mmStr = String(month + 1).padStart(2, '0');
                const ddStr = String(dateCount).padStart(2, '0');
                const dateStr = `${year}-${mmStr}-${ddStr}`;

                // main.js の renderCalendar 内の該当部分を以下に差し替え
                html += `
                    <td class="${className}" data-date="${dateStr}">
                        <div class="date-wrapper">
                            <span class="date-num">${dateCount}</span>
                            <div class="dot-container">
                                <div class="dot-marker dot-meal"></div>
                                <div class="dot-marker dot-sleep"></div>
                                <div class="dot-marker dot-walk"></div>
                                <div class="dot-marker dot-condition"></div>
                            </div>
                        </div>
                    </td>
                `;
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

    // 💡 引数をつけずにシンプルに呼び出し
    await addDotsToCalendar();
}

/**
 * 4項目のデータ有無を個別にチェックし、対応する丸を点灯させる関数
 */
async function addDotsToCalendar() {
    const cells = document.querySelectorAll('#calendar-body td:not(.other-month)');
    
    const promises = Array.from(cells).map(async (cell) => {
        const dateStr = cell.getAttribute('data-date');
        if (!dateStr) return;

        try {
            // 💡 一旦すべての丸の点灯（active）をリセット
            cell.querySelectorAll('.dot-marker').forEach(dot => dot.classList.remove('active'));

            const data = await getDailyData(dateStr);
            
            if (data) {
                // 1. 食事のチェック
                const hasMeal = data.meal && (data.meal.breakfast?.menu || data.meal.lunch?.menu || data.meal.dinner?.menu);
                if (hasMeal) cell.querySelector('.dot-meal')?.classList.add('active');

                // 2. 睡眠のチェック
                const hasSleep = data.sleep && (Number(data.sleep.hour) > 0 || Number(data.sleep.minute) > 0);
                if (hasSleep) cell.querySelector('.dot-sleep')?.classList.add('active');

                // 3. 歩数のチェック
                const hasWalk = data.walk !== undefined && data.walk !== null && Number(data.walk) > 0;
                if (hasWalk) cell.querySelector('.dot-walk')?.classList.add('active');

                // 4. 体調のチェック
                const hasCondition = data.condition !== undefined && data.condition !== null && data.condition !== "";
                if (hasCondition) cell.querySelector('.dot-condition')?.classList.add('active');
            }
        } catch (error) {
            console.error(`ドット確認エラー (${dateStr}):`, error);
        }
    });

    await Promise.all(promises);
}

// カレンダーのマス目クリックイベント
function setupCalendarCellsEvent() {
    const calendarCells = document.querySelectorAll('.calendar tbody td');
    calendarCells.forEach(cell => {
        if (cell.classList.contains('other-month')) return; 
        
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', () => {
            const dateNumEl = cell.querySelector('.date-num');
            const clickedDay = dateNumEl ? parseInt(dateNumEl.textContent, 10) : NaN;
            
            if (!isNaN(clickedDay)) {
                console.log(`カレンダーの ${clickedDay} 日がクリックされました`);
                currentDate.setDate(clickedDay);
                updateDateDisplay(); 
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

    await renderCalendar(); // カレンダー描画が終わるのを待つ

    const dateStr = `${year}-${month}-${date}`;
    console.log(`📅 ${dateStr} のデータを取得します...`);

    updateNavigationLinks(dateStr);

    try {
        const firebaseData = await getDailyData(dateStr);
        updateCardContents(firebaseData);
    } catch (error) {
        console.error("データ自動取得エラー:", error);
    }
}

/**
 * カレンダーの左右矢印ボタンにクリックイベントを設定する関数（月切り替え版・日付維持）
 */
function setupCalendarNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    if (navButtons.length >= 2) {
        const prevBtn = navButtons[0];
        const nextBtn = navButtons[1];

        // 前の月へ
        prevBtn.addEventListener('click', () => {
            const currentDay = currentDate.getDate(); // 現在の日付（例: 14）を記憶
            
            // 1. 一旦、移動先（前月）の末尾の日付を確認する
            const targetMonthLastDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
            
            // 2. もし元の「日」が、移動先の「最大日数」を超えていたら、移動先の月末に合わせる
            //（例: 5月31日にいて、4月へ行く時は「4月30日」にする）
            const safeDay = Math.min(currentDay, targetMonthLastDate);
            
            currentDate.setDate(safeDay); 
            currentDate.setMonth(currentDate.getMonth() - 1);
            updateDateDisplay();
        });

        // 次の月へ
        nextBtn.addEventListener('click', () => {
            const currentDay = currentDate.getDate(); // 現在の日付（例: 14）を記憶
            
            // 1. 一旦、移動先（翌月）の末尾の日付を確認する
            const targetMonthLastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).getDate();
            
            // 2. もし元の「日」が、移動先の「最大日数」を超えていたら、移動先の月末に合わせる
            //（例: 8月31日にいて、9月へ行く時は「9月30日」にする）
            const safeDay = Math.min(currentDay, targetMonthLastDate);
            
            currentDate.setDate(safeDay);
            currentDate.setMonth(currentDate.getMonth() + 1);
            updateDateDisplay();
        });
        
        console.log("✅ カレンダー矢印ボタンの設定が完了しました（日付維持モード）");
    }
}

// アプリの初期化（修正版）
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
            await updateDateDisplay(); // カレンダー描画、Firestore取得、リンク生成の全初期化

            // 💡 【超重要・追加】
            // 他のアプリから「戻る」で帰ってきた時、または画面が写った時に
            // カレンダーの丸マークを強制的に最新状態に更新する
            await addDotsToCalendar();
            console.log("🔄 カレンダーの記録ドットを最新の状態に同期しました");
        }
    } catch (error) {
        console.error("❌ 初期化エラーが発生しました:", error);
    }
}

// アプリ起動
initApp();

// ==========================================================================
// 体調ボタンの自動保存設定
// ==========================================================================
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
                    
                    await addDotsToCalendar(); // 💡 即座に丸を更新

                } catch (error) {
                    console.error("❌ 体調の保存に失敗しました:", error);
                }
            });
        }
    }
});

// ==========================================================================
// メモ欄の自動保存設定（💡 重複を一本化して修正）
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    const memoInput = document.querySelector('.memo-input');
    if (memoInput) {
        memoInput.addEventListener("change", async () => {
            const yyyy = currentDate.getFullYear();
            const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
            const dd = String(currentDate.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            try {
                const memoData = { memo: memoInput.value };
                await saveDailyData(dateStr, memoData);
                console.log(`[Firestore] ${dateStr} のメモを保存しました。`);
                
                await addDotsToCalendar(); // 💡 即座に丸を更新

            } catch (error) {
                console.error("❌ メモの保存に失敗しました:", error);
            }
        });
    }
});

// 💡 画面がブラウザのキャッシュから読み込まれた（戻るボタンで戻ってきた）場合も
// 強制的にカレンダーの丸マークを最新にする魔法のコード
window.addEventListener('pageshow', async (event) => {
    if (event.persisted) {
        console.log("🔄 キャッシュからの復帰を検知。カレンダーを再更新します。");
        await addDotsToCalendar();
    }
});
// ==========================================================================
// 💡 追加：AIによる1ヶ月データ分析機能
// ==========================================================================

/**
 * 指定された年月の1日〜31日までのデータをFirestoreから集めて集計する関数
 * @param {string} yearMonth "2026-05" のような形式
 */
async function fetchMonthlySummary(yearMonth) {
    let totalSteps = 0;
    let stepCountDays = 0;
    let totalSleepMinutes = 0;
    let sleepCountDays = 0;
    let conditionScores = [];

    // 1. 先に31日分のプロミス（リクエスト）の配列を作成する
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    
    const promises = days.map(async (day) => {
        const ddStr = String(day).padStart(2, '0');
        const dateStr = `${yearMonth}-${ddStr}`;
        try {
            return await getDailyData(dateStr);
        } catch (e) {
            console.error(`データ取得エラー (${dateStr}):`, e);
            return null;
        }
    });

    // 2. すべての日のデータを一斉に（並列で）取得する
    const allDaysData = await Promise.all(promises);

    // 3. 取得した結果をまとめて集計する
    allDaysData.forEach((data) => {
        if (data) {
            // 歩数の集計
            if (data.walk !== undefined && data.walk !== null && Number(data.walk) > 0) {
                totalSteps += Number(data.walk);
                stepCountDays++;
            }
            // 睡眠時間の集計
            if (data.sleep) {
                const h = Number(data.sleep.hour) || 0;
                const m = Number(data.sleep.minute) || 0;
                if (h > 0 || m > 0) {
                    totalSleepMinutes += (h * 60 + m);
                    sleepCountDays++;
                }
            }
            // 体調の集計
            if (data.condition) {
                conditionScores.push(Number(data.condition));
            }
        }
    });

    // 統計データの作成
    const avgSteps = stepCountDays > 0 ? Math.round(totalSteps / stepCountDays) : 0;
    const avgSleepMin = sleepCountDays > 0 ? Math.round(totalSleepMinutes / sleepCountDays) : 0;
    const avgSleepStr = `${Math.floor(avgSleepMin / 60)}時間${avgSleepMin % 60}分`;
    const avgCondition = conditionScores.length > 0 ? (conditionScores.reduce((a, b) => a + b, 0) / conditionScores.length).toFixed(1) : "記録なし";

    return {
        targetMonth: yearMonth,
        recordedDays: conditionScores.length,
        averageSteps: `${avgSteps}歩`,
        averageSleep: avgSleepStr,
        averageCondition: `${avgCondition} (5点満点)`
    };
}


/**
 * 【手元テスト用】Cloud Functionsを使わず、ブラウザから直接Gemini APIを叩く関数
 */
async function getAIAnalysis() {
    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const yearMonth = `${yyyy}-${mm}`;

    // 1. 今月のデータを集計（既存の関数をそのまま使用）
    const summaryData = await fetchMonthlySummary(yearMonth);

    if (summaryData.recordedDays === 0) {
        return `${yyyy}年${mm}月はまだ健康データが記録されていないようです。カレンダーに記録をつけてみましょう！`;
    }

    // 🔑 【あなたのAPIキー】ここにGoogle AI Studioで取得したキーを貼り付けてください
    const API_KEY = "AQ.Ab8RN6JJxc2QXj3TlGMuR-chfsqEqGhBfI984uOW3OWOl7jRcw"; 
    
    // Gemini 2.5 Flash を呼び出すURL
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    // 2. AIに渡すプロンプト（命令文）の作成
    const promptText = `
以下の健康データは、ユーザーの1ヶ月間のライフログを集計したものです。
このデータを分析し、親しみやすく、かつ具体的でモチベーションが上がるような健康アドバイス（コメント）を200文字〜300文字程度で生成してください。

【対象月】: ${summaryData.targetMonth}
【記録日数】: ${summaryData.recordedDays} 日
【平均歩数】: ${summaryData.averageSteps}
【平均睡眠時間】: ${summaryData.averageSleep}
【平均体調スコア】: ${summaryData.averageCondition} (5点満点)

### 制約事項
- ユーザーに寄り添う優しいトーンで話しかけてください。
- 歩数、睡眠、体調の数値に具体的に触れて褒めたり、改善のアドバイスをしてください。
- 明日からできる小さなアクションを提案してください。
`;

    // 3. GoogleのAPIへ直接リクエストを送信
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: promptText }]
            }]
        })
    });

    if (!response.ok) {
        throw new Error(`Gemini APIエラー: ${response.status}`);
    }

    const result = await response.json();
    
    // 4. 生成されたテキストを抽出して返す
    try {
        return result.candidates[0].content.parts[0].text;
    } catch (e) {
        throw new Error("AIの返答データ構造の解析に失敗しました。");
    }
}

// ==========================================================================
// 💡 画面上のボタンと連動させる設定（コメント出力後、ユーザーの確認でロック解除版）
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    const analyzeBtn = document.getElementById('analyze-btn');
    const commentEl = document.getElementById('ai-comment');

    if (analyzeBtn && commentEl) {
        commentEl.style.fontSize = "20px"; 
        commentEl.style.lineHeight = "1.6"; 

        // 💡 解除ボタンを動的に作るためのコンテナを準備
        const container = commentEl.parentElement;
        
        // 💡 解除ボタンのHTML要素を作成（最初は非表示）
        const unlockBtn = document.createElement('button');
        unlockBtn.id = 'unlock-btn';
        unlockBtn.textContent = '確認しました（画面のロックを解除） 🔓';
        unlockBtn.style.display = 'none'; // 最初は隠しておく
        container.appendChild(unlockBtn);

        // --- ① 「分析する」ボタンを押したときの処理 ---
        analyzeBtn.addEventListener('click', async () => {
            analyzeBtn.disabled = true; // 分析ボタンと画面全体をロック
            unlockBtn.style.display = 'none'; // 解除ボタンは隠す
            commentEl.innerHTML = "<span style='color: #666; font-size: 18px;'>AIが今月のデータを集計して分析中... 🏃‍♂️💨</span>";
            
            try {
                const advice = await getAIAnalysis();
                commentEl.textContent = advice;
                
                // ✨ 成功したら「解除ボタン」をニュッと表示させる
                unlockBtn.style.display = 'block';
                console.log("✅ AI分析完了。ユーザーの確認ボタンを表示しました。");

            } catch (error) {
                console.error("AI分析エラー詳細:", error);
                let errorMessage = error.message || "原因不明のエラー";
                
                commentEl.innerHTML = `
                    <div style="color: #d32f2f; background: #ffebee; padding: 10px; border-radius: 4px; border: 1px solid #ffcdd2; font-size: 16px;">
                        <strong>ごめんなさい、分析に失敗しました。</strong><br>
                        <span style="font-size: 0.9em; color: #555;">
                            エラー内容: <code style="background: #fff; padding: 2px 4px; border-radius: 3px; font-family: monospace;">${errorMessage}</code>
                        </span>
                    </div>
                `;

                // ⚠️ エラーで失敗した時だけは自動で元の状態（ボタン押せる）に戻す
                analyzeBtn.disabled = false;
            }
        });

        // --- ② 新しく作った「解除ボタン」を押したときの処理 ---
        unlockBtn.addEventListener('click', () => {
            // ✨ 分析ボタンの無効化を解除 ➔ これによりCSSの画面ロックも自動で全解除されます！
            analyzeBtn.disabled = false; 
            
            // 自分自身（解除ボタン）は用が済んだので再び隠す
            unlockBtn.style.display = 'none'; 
            
            console.log("🔓 ユーザーが確認したため、画面のロックを解除しました。");
        });
    }
});