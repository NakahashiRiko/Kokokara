// mealApp.js
import { saveDailyData, getDailyData } from '../services/healthService.js';
import { loginAnonymously } from '../services/authService.js';

// URLの末尾から選択された日付を自動キャッチ
const urlParams = new URLSearchParams(window.location.search);
const targetDate = urlParams.get('date') || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

// 画面が開いた時（初期化）に、Firebaseログインとデータ復元を行う
document.addEventListener('DOMContentLoaded', async () => {
    // 1. 日付テキストエリアの書き換え
    const dateDisplay = document.getElementById('date');
    if (dateDisplay) {
        dateDisplay.textContent = `選択された日付: ${targetDate.replace(/-/g, '/')}`;
    }

    //2. 左上の「＜」戻るボタンのリンク先に日付を引き継がせる
    const backBtn = document.querySelector('.back'); // HTMLのクラス名「back」に合わせる
    if (backBtn) {
        backBtn.setAttribute('href', `frontEnd/src/index.html?date=${targetDate}`);
    }

    // 3. Firebaseに自動ログインし、成功したらデータを復元する
    try {
        const user = await loginAnonymously();
        if (user) {
            console.log("🔥 食事画面でのFirebase接続成功！ UID:", user.uid);
            // ログイン成功後に、Firestoreからデータを読み込む
            await loadExistingMealData();
        }
    } catch (error) {
        console.error("❌ Firebaseログインに失敗しました:", error);
    }
});

/**
 * Firestoreからデータを読み込んで画面に復元する関数
 */
async function loadExistingMealData() {
    try {
        const existingData = await getDailyData(targetDate);
        if (existingData && existingData.meal) {
            console.log(`[データ復元] ${targetDate} の食事データを読み込みました`, existingData.meal);
            const meal = existingData.meal;

            // --- 朝食の復元 ---
            if (meal.breakfast) {
                if (meal.breakfast.menu) document.getElementById('bf_menu').value = meal.breakfast.menu;
                if (meal.breakfast.calorie) document.getElementById('bf_cal').value = meal.breakfast.calorie;
                restoreNutrients('bf_p', 'bf_f', 'bf_c', meal.breakfast.nutrients);
            }

            // --- 昼食の復元 ---
            if (meal.lunch) {
                if (meal.lunch.menu) document.getElementById('lh_menu').value = meal.lunch.menu;
                if (meal.lunch.calorie) document.getElementById('lh_cal').value = meal.lunch.calorie;
                restoreNutrients('lh_p', 'lh_f', 'lh_c', meal.lunch.nutrients);
            }

            // --- 夕食の復元 ---
            if (meal.dinner) {
                if (meal.dinner.menu) document.getElementById('dn_menu').value = meal.dinner.menu;
                if (meal.dinner.calorie) document.getElementById('dn_cal').value = meal.dinner.calorie;
                restoreNutrients('dn_p', 'dn_f', 'dn_c', meal.dinner.nutrients);
            }

            // 初期ロード時にも集計表示（食事回数など）をHTMLに反映させるため、ボタンのイベントを1回キック
            updateMealSummaryDisplay();
        }
    } catch (error) {
        console.error("❌ 食事データの読み込みに失敗しました:", error);
    }
}

// 栄養素のチェックボックスを自動でONにするための補助関数
function restoreNutrients(pId, fId, cId, nutrientsArray) {
    if (!nutrientsArray) return;
    if (nutrientsArray.includes('たんぱく質')) document.getElementById(pId).checked = true;
    if (nutrientsArray.includes('脂質')) document.getElementById(fId).checked = true;
    if (nutrientsArray.includes('炭水化物')) document.getElementById(cId).checked = true;
}


//-------------------------[機能1]朝食の栄養素を配列に格納する-------------------------//
function bfNutrients(){
    let bfNutrientsArray = [];
    let bfProtein = document.getElementById('bf_p');
    let bfFat = document.getElementById('bf_f');
    let bfCarbo = document.getElementById('bf_c');

    if(bfProtein.checked){ bfNutrientsArray.push('たんぱく質'); }
    if(bfFat.checked){ bfNutrientsArray.push('脂質'); }
    if(bfCarbo.checked){ bfNutrientsArray.push('炭水化物'); }

    return bfNutrientsArray;
}

//-------------------------[機能2]昼食の栄養素を配列に格納する-------------------------//
function lhNutrients(){
    let lhNutrientsArray = [];
    let lhProtein = document.getElementById('lh_p');
    let lhFat = document.getElementById('lh_f');
    let lhCarbo = document.getElementById('lh_c');

    if(lhProtein.checked){ lhNutrientsArray.push('たんぱく質'); }
    if(lhFat.checked){ lhNutrientsArray.push('脂質'); }
    if(lhCarbo.checked){ lhNutrientsArray.push('炭水化物'); }

    return lhNutrientsArray;
}

//-------------------------[機能3]夕食の栄養素を配列に格納する-------------------------//
function dnNutrients(){
    let dnNutrientsArray = [];
    let dnProtein = document.getElementById('dn_p');
    let dnFat = document.getElementById('dn_f');
    let dnCarbo = document.getElementById('dn_c');

    if(dnProtein.checked){ dnNutrientsArray.push('たんぱく質'); }
    if(dnFat.checked){ dnNutrientsArray.push('脂質'); }
    if(dnCarbo.checked){ dnNutrientsArray.push('炭水化物'); }

    return dnNutrientsArray;
}

//-------------------------[機能4]食事回数をカウントする-------------------------//
function countMeals(){
    let mealCount = 0;
    let bfMenu = document.getElementById('bf_menu').value;
    let lhMenu = document.getElementById('lh_menu').value;
    let dnMenu = document.getElementById('dn_menu').value;

    if(bfMenu !== ''){ mealCount++; }
    if(lhMenu !== ''){ mealCount++; }
    if(dnMenu !== ''){ mealCount++; }

    return mealCount;
}

//-------------------------[機能4-2]不足栄養素を格納する-------------------------//
function lackNutrients(){
    let requiredNutrients = ['たんぱく質', '脂質', '炭水化物'];
    let takenNutrients = [];

    let bf = bfNutrients();
    let lh = lhNutrients();
    let dn = dnNutrients();

    takenNutrients = takenNutrients.concat(bf, lh, dn);

    let uniqueTakenNutrients = Array.from(new Set(takenNutrients));

    let lackNutrientsArray = requiredNutrients.filter(nutrient => !uniqueTakenNutrients.includes(nutrient));

    return lackNutrientsArray;
}

// 画面表示を更新するための共通集計ロジック
function updateMealSummaryDisplay() {
    let todayMealCount = countMeals();
    let mealCountText = document.getElementById('meal_count');
    if (mealCountText) mealCountText.textContent = `本日の食事回数: ${todayMealCount}回`;

    let lackNutrientsArray = lackNutrients();
    let lackNutrientsText = document.getElementById('lack_nutrients');
    if (lackNutrientsText) {
        if(lackNutrientsArray.length > 0){
            lackNutrientsText.textContent = `本日の不足栄養素: ${lackNutrientsArray.join(', ')}`;
        } else {
            lackNutrientsText.textContent = `本日の不足栄養素: なし`;
        }
    }
}

//---------------------[機能5]記録保存ボタンの動作-------------------------//
const finishBtn = document.getElementById('save_records_btn');

finishBtn.addEventListener('click', async () => {

    // 画面上の集計テキスト（回数・不足栄養素）を最新にする
    updateMealSummaryDisplay();

    // 画面の全ての入力欄からデータを回収して、Firestoreへ自動保存する
    const bfMenu = document.getElementById('bf_menu').value;
    const bfCal = parseInt(document.getElementById('bf_cal').value) || 0;
    
    const lhMenu = document.getElementById('lh_menu').value;
    const lhCal = parseInt(document.getElementById('lh_cal').value) || 0;
    
    const dnMenu = document.getElementById('dn_menu').value;
    const dnCal = parseInt(document.getElementById('dn_cal').value) || 0;

    try {
        const mealDataObj = {
            meal: {
                breakfast: {
                    menu: bfMenu,
                    calorie: bfCal,
                    nutrients: bfNutrients()
                },
                lunch: {
                    menu: lhMenu,
                    calorie: lhCal,
                    nutrients: lhNutrients()
                },
                dinner: {
                    menu: dnMenu,
                    calorie: dnCal,
                    nutrients: dnNutrients()
                }
            }
        };

        // データを送信して保存
        await saveDailyData(targetDate, mealDataObj);
        alert(`✅ ${targetDate} の食事データをFirestoreに保存しました！`);

        // 保存が成功したら、日付を引き継いだままホーム画面に戻る
        window.location.href = `frontEnd/src/index.html?date=${targetDate}`;

    } catch (error) {
        console.error("❌ 食事データの保存に失敗しました:", error);
        alert("データの保存に失敗しました。");
    }
});