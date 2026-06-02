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
// [機能2] 食事回数のカウント
// ------------------------------------------------------------------
function checkMeal(mealType){
    let timeInput = document.getElementById(`${mealType}_really_time`);
    let menuInput = document.getElementById(`${mealType}_menu`);
    let nutrientsInput = document.querySelectorAll(`#${mealType}_nutrients input[type="checkbox"]:checked`);

    // 上3つの項目が全て記入されてる状態であったら食事をしたと見なす
    if((timeInput && timeInput.value != "") && (menuInput && menuInput.value != "") && (nutrientsInput.length > 0)){
        return true;
    }
    else{
        return false;
    }
}

function countMeals(){
    let count = 0;
    if(checkMeal('breakfast')) count++;
    if(checkMeal('lunch'))     count++;
    if(checkMeal('dinner'))    count++;
    return count;
}


// ------------------------------------------------------------------
// [機能3] 不足栄養素を見つける
// ------------------------------------------------------------------
function lackNutrients(){
    let lackNutrientsArray = ["炭水化物", "タンパク質", "脂質", "ビタミン", "ミネラル"];
    const types = ['breakfast', 'lunch', 'dinner'];

    types.forEach(type => {
        let checkedBoxes = document.querySelectorAll(`#${type}_nutrients input[type="checkbox"]:checked`);
        checkedBoxes.forEach(box => {
            let index = lackNutrientsArray.indexOf(box.value);
            if(index !== -1){
                lackNutrientsArray.splice(index, 1);
            }
        });
    });

    return lackNutrientsArray;
}


// ------------------------------------------------------------------
// [機能4 / 機能7] 記録済みの内容をロックする（※未記入の部分はロックしない）
// ------------------------------------------------------------------
function lockMeal(mealType) {
    // 1. 食事開始時刻をロック（入力がある場合のみ）
    const timeInput = document.getElementById(`${mealType}_really_time`);
    if (timeInput && timeInput.value !== "") {
        timeInput.disabled = true;
    }

    // 2. 献立をロック（入力がある場合のみ）
    const menuInput = document.getElementById(`${mealType}_menu`);
    if (menuInput && menuInput.value !== "") {
        menuInput.disabled = true;
    }

    // 3. 栄養素をロック（1つでもチェックがついている場合のみ、その食事の全ボックスをロック）
    const checkedNutrients = document.querySelectorAll(`#${mealType}_nutrients input[type="checkbox"]:checked`);
    if (checkedNutrients.length > 0) {
        const allNutrientsInput = document.querySelectorAll(`#${mealType}_nutrients input[type="checkbox"]`);
        allNutrientsInput.forEach(box => {
            box.disabled = true; 
        });
    }
}


// ------------------------------------------------------------------
// [機能5] 未記入欄があれば警告する
// ------------------------------------------------------------------
function checkUnfilledFields(mealType, mealName){
    let time = document.getElementById(`${mealType}_really_time`).value;
    let menu = document.getElementById(`${mealType}_menu`).value;
    let nutrients = document.querySelectorAll(`#${mealType}_nutrients input[type="checkbox"]:checked`);

    // その食事の記録欄が全て未記入の場合
    if(time == "" && menu == "" && nutrients.length == 0){
        let confirmCheck = confirm(`⚠️${mealName}の記録がされていません⚠️\n${mealName}を摂取していないならば\nOK\nを押してください。そのままで構いません。\n摂取したのであれば\nキャンセル\nを押して記入してください。`);
        if(confirmCheck){
            return false; // 摂取していないのでエラーなし扱いにする
        }
        else{
            return true; // 記入を促すためにエラーありにする
        }
    }
    // 一部だけ未記入（記入漏れ）の場合
    else{
        let unfilledFields = [];
        if(time == "") unfilledFields.push("時刻");
        if(menu == "") unfilledFields.push("献立");
        if(nutrients.length == 0) unfilledFields.push("栄養素");

        if(unfilledFields.length > 0){
            alert(`⚠️記入漏れ⚠️\n${mealName}の\n${unfilledFields.join('と')}\nが記入されていません。`);
            return true;
        }
        return false;
    }
}


// ------------------------------------------------------------------
// [機能8] コメント生成ボタンの動作（[機能9] を統合）
// ------------------------------------------------------------------
const commentBtn = document.getElementById('create_comment_btn');
if (commentBtn) {
    commentBtn.addEventListener('click', () => {
        let todayMealCount = countMeals();
        let lackNutrientsArray = lackNutrients();
        let commentText = document.getElementById('comment');

        if (!commentText) return;

        // ご提示いただいたオリジナル仕様の条件分岐メッセージ
        if(lackNutrientsArray.length > 0){
            commentText.textContent = `本日の食事は${todayMealCount}回でした。${lackNutrientsArray.join('・')}が不足気味なので、明日は摂取できるようにしましょう！`;
        } else {
            commentText.textContent = `本日の食事は${todayMealCount}回でした。栄養素はパーフェクトです！明日もこの調子でいきましょう！`;
        }
    });
}