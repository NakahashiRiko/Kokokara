/**
 * ==========================================================================
 * アプリケーション設定 ＆ グローバル変数
 * ==========================================================================
 */
import { loginAnonymously } from './services/authService.js';
import { saveDailyData, getDailyData } from './services/healthService.js'; 

// アプリ全体で「今何日を選択しているか」を記憶する変数
let currentDate = new Date(); 

// 曜日表示用の日本語変換マップ
const weekDays = ["日", "月", "火", "水", "木", "金", "土"];


/**
 * ==========================================================================
 * 画面更新・UI操作系関数
 * ==========================================================================
 */

/**
 * 画面の日付表示を更新し、連動するデータ（リンク・UI・カレンダー）を再読み込みする
 */
async function updateDateDisplay() {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const date = String(currentDate.getDate()).padStart(2, '0');
    const day = weekDays[currentDate.getDay()];

    // 画面上部の日付ヘッダーを更新
    const dateDisplay = document.querySelector('.current-date');
    if (dateDisplay) {
        dateDisplay.textContent = `${year}/${month}/${date}（${day}）`;
    }

    // カレンダーの再描画（完了を待つ）
    await renderCalendar(); 

    const dateStr = `${year}-${month}-${date}`;
    console.log(`📅 ${dateStr} のデータを取得します...`);

    // 各カードの遷移先リンクに日付パラメータを付与
    updateNavigationLinks(dateStr);

    try {
        // Firestoreから該当日のデータを取得してカードを書き換え
        const firebaseData = await getDailyData(dateStr);
        updateCardContents(firebaseData);
    } catch (error) {
        console.error("データ自動取得エラー:", error);
    }
}

/**
 * 各機能カード（食事、睡眠、歩数）のリンク（href）に選択中の一意な日付パラメータを付与する
 * @param {string} dateStr - YYYY-MM-DD 形式の日付文字列
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
 * Firestoreから取得した健康データを画面の各コンポーネント（カード・入力欄）に反映する
 * @param {Object} data - Firestoreから取得した1日分のデータオブジェクト
 */
function updateCardContents(data) {
    // 1. 食事カードの書き換え
    const mealCardContent = document.querySelector('.card.meal .card-content');
    if (mealCardContent) {
        if (data && data.meal) {
            // 開始時刻、献立、栄養素のすべてが入力されているか判定する内部関数
            const isMealComplete = (meal) => {
                return meal && meal.menu !== "" && meal.time !== "" && meal.nutrients !== "";
            };

            const breakfastStatus = isMealComplete(data.meal.breakfast) ? "済" : "未";
            const lunchStatus = isMealComplete(data.meal.lunch) ? "済" : "未";
            const dinnerStatus = isMealComplete(data.meal.dinner) ? "済" : "未";

            mealCardContent.innerHTML = `
                <p>朝：${breakfastStatus}</p>
                <p>昼：${lunchStatus}</p>
                <p>晩：${dinnerStatus}</p>
            `;
        } else {
            mealCardContent.innerHTML = `<p>朝：未</p><p>昼：未</p><p>晩：未</p>`;
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

    // 4. コンディション（体調）ラジオボタンの書き換え
    if (data && data.condition !== undefined) {
        const savedCondition = data.condition;
        const targetRadio = document.getElementById(`cond-${savedCondition}`);
        if (targetRadio) targetRadio.checked = true;
    } else {
        // データがない場合はすべてのラジオボタンのチェックを外す
        for (let i = 1; i <= 5; i++) {
            const radioBtn = document.getElementById(`cond-${i}`);
            if (radioBtn) radioBtn.checked = false;
        }
    }

    // 5. メモ欄の書き換え
    const memoInput = document.querySelector('.memo-input');
    if (memoInput) {
        memoInput.value = (data && data.memo !== undefined) ? data.memo : "";
    }
}


/**
 * ==========================================================================
 * カレンダー生成 ＆ ドット表示ロジック
 * ==========================================================================
 */

/**
 * 月ごとのカレンダー（HTMLテーブル）を自動生成し、描画する
 */
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
            // 前月の余白埋め
            if (i === 0 && j < firstDayOfThisMonth) {
                const lastMonthDate = lastDateOfLastMonth - firstDayOfThisMonth + j + 1;
                html += `<td class="other-month">${lastMonthDate}</td>`;
            // 翌月の余白埋め
            } else if (dateCount > lastDateOfThisMonth) {
                html += `<td class="other-month">${nextMonthDateCount}</td>`;
                nextMonthDateCount++;
            // 今月の日付枠
            } else {
                const isSelectedDay = (dateCount === currentDate.getDate());
                const className = isSelectedDay ? 'today' : '';
                
                const mmStr = String(month + 1).padStart(2, '0');
                const ddStr = String(dateCount).padStart(2, '0');
                const dateStr = `${year}-${mmStr}-${ddStr}`;

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
        
        // 全ての日付を埋め終えたらループを抜ける
        if (dateCount > lastDateOfThisMonth && nextMonthDateCount > 1) {
            break;
        }
    }

    calendarBody.innerHTML = html;
    setupCalendarCellsEvent(); // マスクリックイベントの再割り当て

    // カレンダー表示完了後、非同期で各日のドット（記録の有無）を打つ
    await addDotsToCalendar();
}

/**
 * カレンダーの各日付に対して、4項目のデータ有無をチェックし、対応するドットを点灯（active）させる
 */
async function addDotsToCalendar() {
    const cells = document.querySelectorAll('#calendar-body td:not(.other-month)');
    
    const promises = Array.from(cells).map(async (cell) => {
        const dateStr = cell.getAttribute('data-date');
        if (!dateStr) return;

        try {
            // 一旦すべてのドットの点灯をリセット
            cell.querySelectorAll('.dot-marker').forEach(dot => dot.classList.remove('active'));

            const data = await getDailyData(dateStr);
            
            if (data) {
                // 1. 食事のチェック（いずれかの食事にメニューが入っていればON）
                const hasMeal = data.meal && (data.meal.breakfast?.menu || data.meal.lunch?.menu || data.meal.dinner?.menu);
                if (hasMeal) cell.querySelector('.dot-meal')?.classList.add('active');

                // 2. 睡眠のチェック（時間または分が0より大きければON）
                const hasSleep = data.sleep && (Number(data.sleep.hour) > 0 || Number(data.sleep.minute) > 0);
                if (hasSleep) cell.querySelector('.dot-sleep')?.classList.add('active');

                // 3. 歩数のチェック（0歩より多ければON）
                const hasWalk = data.walk !== undefined && data.walk !== null && Number(data.walk) > 0;
                if (hasWalk) cell.querySelector('.dot-walk')?.classList.add('active');

                // 4. 体調のチェック（値が存在すればON）
                const hasCondition = data.condition !== undefined && data.condition !== null && data.condition !== "";
                if (hasCondition) cell.querySelector('.dot-condition')?.classList.add('active');
            }
        } catch (error) {
            console.error(`ドット確認エラー (${dateStr}):`, error);
        }
    });

    await Promise.all(promises);
}


/**
 * ==========================================================================
 * ナビゲーション ＆ イベントリスナー設定
 * ==========================================================================
 */

/**
 * カレンダー内のマス目（日付）がクリックされた時のイベントを設定する
 */
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
 * カレンダーの「前月」「次月」切り替えボタンにイベントを設定する（選択日を可能な限り維持）
 */
function setupCalendarNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    if (navButtons.length < 2) return;

    const prevBtn = navButtons[0];
    const nextBtn = navButtons[1];

    // 前の月へ
    prevBtn.addEventListener('click', () => {
        const currentDay = currentDate.getDate();
        const targetMonthLastDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
        const safeDay = Math.min(currentDay, targetMonthLastDate); // 存在しない日付（例: 5/31から4月へ行く場合の31日）を防止
        
        currentDate.setDate(safeDay); 
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateDateDisplay();
    });

    // 次の月へ
    nextBtn.addEventListener('click', () => {
        const currentDay = currentDate.getDate();
        const targetMonthLastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).getDate();
        const safeDay = Math.min(currentDay, targetMonthLastDate);
        
        currentDate.setDate(safeDay);
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateDateDisplay();
    });
    
    console.log("✅ カレンダー矢印ボタンの設定が完了しました（日付維持モード）");
}


/**
 * ==========================================================================
 * AIによるデータ分析機能（Gemini API連携）
 * ==========================================================================
 */

/**
 * 指定された年月の1か月分のデータをFirestoreから集計する
 * @param {string} yearMonth - "YYYY-MM" 形式の文字列
 * @returns {Object} 集計された統計データオブジェクト
 */
async function fetchMonthlySummary(yearMonth) {
    let totalSteps = 0;
    let stepCountDays = 0;
    let totalSleepMinutes = 0;
    let sleepCountDays = 0;
    let conditionScores = [];

    // 1〜31日分のリクエストを並列で作成
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

    // すべてのデータを一斉に取得
    const allDaysData = await Promise.all(promises);

    // データの集計処理
    allDaysData.forEach((data) => {
        if (!data) return;

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
    });

    // 平均値の計算
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
 * 集計データを基に、Gemini APIを直接呼び出してAI健康アドバイスを生成する
 * @returns {string} 生成されたアドバイス文面
 */
async function getAIAnalysis() {
    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const yearMonth = `${yyyy}-${mm}`;

    const summaryData = await fetchMonthlySummary(yearMonth);

    if (summaryData.recordedDays === 0) {
        return `${yyyy}年${mm}月はまだ健康データが記録されていないようです。カレンダーに記録をつけてみましょう！`;
    }

    // API設定
    const API_KEY = "AQ.Ab8RN6JJxc2QXj3TlGMuR-chfsqEqGhBfI984uOW3OWOl7jRcw"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    // 送信用プロンプトの組み立て
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

    // APIリクエストの送信
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
        })
    });

    if (!response.ok) {
        throw new Error(`Gemini APIエラー: ${response.status}`);
    }

    const result = await response.json();
    
    try {
        return result.candidates[0].content.parts[0].text;
    } catch (e) {
        throw new Error("AIの返答データ構造の解析に失敗しました。");
    }
}


/**
 * ==========================================================================
 * アプリケーション初期化 ＆ ライフサイクル管理
 * ==========================================================================
 */

/**
 * 認証を通し、URLパラメータからの日付復元、各種イベントを設定してアプリを起動する
 */
async function initApp() {
    try {
        const user = await loginAnonymously();
        if (user) {
            console.log("🔥 Firebase接続成功！ UID:", user.uid);

            // サブアプリから戻ってきた際、URLパラメータに日付があれば復元
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
            await updateDateDisplay(); // カレンダー描画、データ取得、UIの全初期化

            // 初回表示時にドットマーカーを最新状態にする
            await addDotsToCalendar();
            console.log("🔄 カレンダーの記録ドットを最新の状態に同期しました");
        }
    } catch (error) {
        console.error("❌ 初期化エラーが発生しました:", error);
    }
}

// アプリの起動
initApp();


/**
 * ==========================================================================
 * DOMContentLoaded（自動保存・UI連動系イベント一元化）
 * ==========================================================================
 */
document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. 体調ボタン（ラジオボタン変更時）の自動保存設定 ---
    for (let i = 1; i <= 5; i++) {
        const radioBtn = document.getElementById(`cond-${i}`);
        if (radioBtn) {
            radioBtn.addEventListener("change", async () => {
                const yyyy = currentDate.getFullYear();
                const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
                const dd = String(currentDate.getDate()).padStart(2, '0');
                const dateStr = `${yyyy}-${mm}-${dd}`;

                try {
                    await saveDailyData(dateStr, { condition: i });
                    console.log(`[Firestore] ${dateStr} の体調を ${i} に保存しました。`);
                    await addDotsToCalendar(); // カレンダーのドットを即座に更新
                } catch (error) {
                    console.error("❌ 体調の保存に失敗しました:", error);
                }
            });
        }
    }

    // --- 2. メモ欄（フォーカスアウト・値確定時）の自動保存設定 ---
    const memoInput = document.querySelector('.memo-input');
    if (memoInput) {
        memoInput.addEventListener("change", async () => {
            const yyyy = currentDate.getFullYear();
            const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
            const dd = String(currentDate.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            try {
                await saveDailyData(dateStr, { memo: memoInput.value });
                console.log(`[Firestore] ${dateStr} のメモを保存しました。`);
                await addDotsToCalendar(); // カレンダーのドットを即座に更新
            } catch (error) {
                console.error("❌ メモの保存に失敗しました:", error);
            }
        });
    }

    // --- 3. AI分析ボタン ＆ 画面ロック解除のイベント設定 ---
    const analyzeBtn = document.getElementById('analyze-btn');
    const commentEl = document.getElementById('ai-comment');

    if (analyzeBtn && commentEl) {
        commentEl.style.fontSize = "20px"; 
        commentEl.style.lineHeight = "1.6"; 

        const container = commentEl.parentElement;
        
        // 解除ボタンのHTML要素を動的に生成（最初は非表示）
        const unlockBtn = document.createElement('button');
        unlockBtn.id = 'unlock-btn';
        unlockBtn.textContent = '確認しました（画面のロックを解除） 🔓';
        unlockBtn.style.display = 'none'; 
        container.appendChild(unlockBtn);

        // 「分析する」ボタンを押したときの処理
        analyzeBtn.addEventListener('click', async () => {
            analyzeBtn.disabled = true;       // ボタンおよび付随するCSSで画面全体をロック
            unlockBtn.style.display = 'none'; // 解除ボタンを隠す
            commentEl.innerHTML = "<span style='color: #666; font-size: 18px;'>AIが今月のデータを集計して分析中... 🏃‍♂️💨</span>";
            
            try {
                const advice = await getAIAnalysis();
                commentEl.textContent = advice;
                unlockBtn.style.display = 'block'; // 成功したら確認（解除）ボタンを表示
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
                analyzeBtn.disabled = false; // エラー時のみ自動でロック解除
            }
        });

        // 「確認しました（解除）」ボタンを押したときの処理
        unlockBtn.addEventListener('click', () => {
            analyzeBtn.disabled = false;     // 分析ボタンの無効化を解除（CSSによる画面ロックも解除）
            unlockBtn.style.display = 'none'; // 自分自身を再び隠す
            console.log("🔓 ユーザーが確認したため、画面のロックを解除しました。");
        });
    }
});


/**
 * ==========================================================================
 * ブラウザバック（キャッシュ復帰）対策
 * ==========================================================================
 */
// 画面がブラウザキャッシュから読み込まれた（戻るボタンなど）際もカレンダーのドットを強制最新化
window.addEventListener('pageshow', async (event) => {
    if (event.persisted) {
        console.log("🔄 キャッシュからの復帰を検知。カレンダーを再更新します。");
        await addDotsToCalendar();
    }
});