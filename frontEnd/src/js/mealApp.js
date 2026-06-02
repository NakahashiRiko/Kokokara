// mealApp.js
import { saveDailyData, getDailyData } from '../services/healthService.js';
import { loginAnonymously } from '../services/authService.js';

// URLの末尾から選択された日付を自動キャッチ
const urlParams = new URLSearchParams(window.location.search);
let targetDate = urlParams.get('date') || new Date().toISOString().split('T')[0];

if (!targetDate) {
    const now = new Date();
    targetDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 画面が読み込まれた時の初期化処理（既存データの自動復元と戻るボタン）
document.addEventListener('DOMContentLoaded', async () => {
    const dateDisplay = document.getElementById('date');
    if (dateDisplay) {
        dateDisplay.textContent = `日付: ${targetDate.replace(/-/g, '/')}`;
    }

    // 左上の「＜」ボタンで日付を保持してホームに戻る
    const backBtn = document.getElementById('back_app_btn');
    if (backBtn) {
        backBtn.style.cursor = 'pointer';
        backBtn.addEventListener('click', () => {
            window.location.href = `frontEnd/src/index.html?date=${targetDate}`;
        });
    }

    // Firebase匿名ログインを実行
    try {
        const user = await loginAnonymously();
        if (user) {
            console.log("🔥 食事画面でのFirebase接続成功！ UID:", user.uid);

            // ログインに成功したので、Firestoreから過去のデータを読み込んで画面に自動復元
            const savedData = await getDailyData(targetDate);
            if (savedData && savedData.meal) {
                console.log("🥗 過去の食事データを自動復元します:", savedData.meal);
                restoreMealData(savedData.meal);
            }
        }
    } catch (error) {
        console.error("❌ Firebaseログイン、またはデータの読み込みに失敗しました:", error);
    }
});

/**
 * データを画面の入力欄にセットする復元関数（really_timeに対応）
 */
function restoreMealData(meal) {
    const types = ['breakfast', 'lunch', 'dinner'];
    const nutrientsList = ['carbo', 'protein', 'fat', 'vitamin', 'mineral'];

    types.forEach(type => {
        const mealTime = meal[type];
        if (!mealTime) return;

        // 1. 献立（メニュー）の復元
        const menuInput = document.getElementById(`${type}_menu`);
        if (menuInput && mealTime.menu) menuInput.value = mealTime.menu;

        // 2. 時間の復元（例: breakfast_really_time）
        const timeInput = document.getElementById(`${type}_really_time`);
        if (timeInput && mealTime.time) {
            timeInput.value = mealTime.time;
        }

        // 3. 栄養素チェックボックスの復元
        if (mealTime.nutrients && Array.isArray(mealTime.nutrients)) {
            nutrientsList.forEach(nut => {
                const checkbox = document.getElementById(`${nut}_${type}`);
                if (checkbox) {
                    checkbox.checked = mealTime.nutrients.includes(checkbox.value);
                }
            });
        }
    });

    const otherInput = document.getElementById('other_meals_input');
    if (otherInput && meal.other) otherInput.value = meal.other;
}

/**
 * 共通：現在の画面の入力内容を集めてFirestore用のオブジェクトを作る関数（really_timeに対応）
 */
function createMealDataObject() {
    const types = ['breakfast', 'lunch', 'dinner'];
    const nutrientsList = ['carbo', 'protein', 'fat', 'vitamin', 'mineral'];
    const mealDataObj = { meal: {} };

    types.forEach(type => {
        const menuValue = document.getElementById(`${type}_menu`).value;
        
        // 時間の入力欄（例: breakfast_really_time）から安全に値を取得
        const timeElement = document.getElementById(`${type}_really_time`);
        const timeValue = timeElement ? timeElement.value : "";

        const selectedNutrients = [];
        nutrientsList.forEach(nut => {
            const checkbox = document.getElementById(`${nut}_${type}`);
            if (checkbox && checkbox.checked) {
                selectedNutrients.push(checkbox.value);
            }
        });

        mealDataObj.style = "logged"; 
        mealDataObj.meal[type] = {
            menu: menuValue,
            time: timeValue, 
            nutrients: selectedNutrients
        };
    });

    mealDataObj.meal.other = document.getElementById('other_meals_input').value;
    return mealDataObj;
}


// ------------------------------------------------------------------
// ボタン1：記録保存（途中保存）ボタンの動作
// ------------------------------------------------------------------
const finishBtn = document.getElementById('save_records_btn');
if (finishBtn) {
    finishBtn.addEventListener('click', async () => {
        // 画面ロック処理
        lockMeal('breakfast');
        lockMeal('lunch');
        lockMeal('dinner');

        // 途中の状態のままFirestoreにデータを保存する
        try {
            const mealDataObj = createMealDataObject();
            await saveDailyData(targetDate, mealDataObj);
            console.log("✅ 途中の食事記録を一時保存しました:", mealDataObj);
            alert("食事記録を一時保存しました（ロックされました）");
        } catch (error) {
            console.error("❌ 一時保存に失敗しました:", error);
            alert("保存に失敗しました。");
        }
    });
}


// ------------------------------------------------------------------
// ボタン2：完全に記入し終わってから保存する「記録確定」ボタン
// ------------------------------------------------------------------
const finishTodayBtn = document.getElementById('finish_today_btn');
if (finishTodayBtn) {
    finishTodayBtn.addEventListener('click', async () => {
        
        // 記入漏れがないかチェック
        let breakfastError = checkUnfilledFields('breakfast', "朝食");
        let lunchError = checkUnfilledFields('lunch', "昼食");
        let dinnerError = checkUnfilledFields('dinner', "夕食");

        // どれか一つでも記入漏れ（エラー）があれば、ここで処理を絶対に中断する！
        if (breakfastError || lunchError || dinnerError) {
            alert("未記入の項目があるため、記録確定はできません。未記入で保存したい場合は『記録保存』ボタンを使用してください。");
            return; 
        }

        // 全て記入されていれば保存を実行
        try {
            const mealDataObj = createMealDataObject();
            await saveDailyData(targetDate, mealDataObj);
            console.log("🔥 全記入完了！ 記録確定しました:", mealDataObj);
            
            alert(`✅ ${targetDate.replace(/-/g, '/')} の食事記録を確定しました！ホームに戻ります。`);
            // 選択していた日付を維持してカレンダーへ戻る
            window.location.href = `frontEnd/src/index.html?date=${targetDate}`;

        } catch (error) {
            console.error("❌ 記録確定に失敗しました:", error);
            alert("データベースへの保存に失敗しました。");
        }
    });
}


// ------------------------------------------------------------------
// 付属のユーティリティ関数
// ------------------------------------------------------------------
function lockMeal(mealType) {
    const menuInput = document.getElementById(`${mealType}_menu`);
    if (menuInput) menuInput.disabled = true;

    const timeInput = document.getElementById(`${mealType}_really_time`);
    if (timeInput) timeInput.disabled = true;

    const nutrients = ['carbo', 'protein', 'fat', 'vitamin', 'mineral'];
    nutrients.forEach(nutrient => {
        const checkbox = document.getElementById(`${nutrient}_${mealType}`);
        if (checkbox) checkbox.disabled = true;
    });
}

function countMeals() {
    let mealCount = 0;
    if (document.getElementById('breakfast_menu') && document.getElementById('breakfast_menu').value !== "") mealCount++;
    if (document.getElementById('lunch_menu') && document.getElementById('lunch_menu').value !== "") mealCount++;
    if (document.getElementById('dinner_menu') && document.getElementById('dinner_menu').value !== "") mealCount++;
    return mealCount;
}

function lackNutrients() {
    const nutrientsList = ['炭水化物', 'タンパク質', '脂質', 'ビタミン', 'ミネラル'];
    const idPrefixes = ['carbo', 'protein', 'fat', 'vitamin', 'mineral'];
    const types = ['breakfast', 'lunch', 'dinner'];
    const checkStatus = [false, false, false, false, false];

    types.forEach(type => {
        idPrefixes.forEach((prefix, index) => {
            const checkbox = document.getElementById(`${prefix}_${type}`);
            if (checkbox && checkbox.checked) {
                checkStatus[index] = true;
            }
        });
    });

    const result = [];
    checkStatus.forEach((status, index) => {
        if (!status) {
            result.push(nutrientsList[index]);
        }
    });
    return result;
}

function checkUnfilledFields(mealType, mealLabel) {
    let unfilledFields = [];
    
    // 献立のチェック
    const menuEl = document.getElementById(`${mealType}_menu`);
    if (menuEl && menuEl.value === "") {
        unfilledFields.push("献立");
    }

    // 時間のチェック (really_time に合わせました)
    const timeEl = document.getElementById(`${mealType}_really_time`);
    if (timeEl && timeEl.value === "") {
        unfilledFields.push("時間");
    }

    // 栄養素のチェック
    const nutrients = ['carbo', 'protein', 'fat', 'vitamin', 'mineral'];
    let anyChecked = false;
    nutrients.forEach(nutrient => {
        const checkbox = document.getElementById(`${nutrient}_${mealType}`);
        if (checkbox && checkbox.checked) anyChecked = true;
    });

    if (!anyChecked) {
        unfilledFields.push("栄養素");
    }

    if (unfilledFields.length > 0) {
        alert(`${mealLabel}の${unfilledFields.join('と')}が記入されていません。`);
        return true; // エラーあり
    }
    return false; // エラーなし
}

// コメント生成ボタンの動作
const commentBtn = document.getElementById('create_comment_btn');
if (commentBtn) {
    commentBtn.addEventListener('click', () => {
        let todayMealCount = countMeals();
        let lackNutrientsArray = lackNutrients();
        let commentText = document.getElementById('comment');

        if (!commentText) return;

        if (todayMealCount === 3 && lackNutrientsArray.length === 0) {
            commentText.textContent = "完璧な食事です！この調子で頑張りましょう！";
        } else if (todayMealCount < 3 && lackNutrientsArray.length === 0) {
            commentText.textContent = `食事回数が ${todayMealCount} 回と少ないです。1日3食しっかり食べましょう。栄養素はばっちりです！`;
        } else if (todayMealCount === 3 && lackNutrientsArray.length > 0) {
            commentText.textContent = `1日3食食べられて素晴らしいです！不足している栄養素（${lackNutrientsArray.join('、')}）を意識して摂るとさらに良くなります。`;
        } else {
            commentText.textContent = `食事回数が ${todayMealCount} 回と少なく、栄養素（${lackNutrientsArray.join('、')}）も不足しています。意識して食事を摂るようにしましょう。`;
        }
    });
}