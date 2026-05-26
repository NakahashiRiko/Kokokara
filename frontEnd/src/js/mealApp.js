// mealApp.js
import { saveDailyData, getDailyData } from '../services/healthService.js'; // 🌟 getDailyDataを追加

// URLの末尾から選択された日付を自動キャッチ
const urlParams = new URLSearchParams(window.location.search);
const targetDate = urlParams.get('date') || new Date().toISOString().split('T')[0];

//画面が開いた時（初期化）に、Firestoreから既存データを読み込んで画面に表示する処理
document.addEventListener('DOMContentLoaded', async () => {
    // 1. 日付テキストエリアの書き換え
    const dateDisplay = document.getElementById('date');
    if (dateDisplay) {
        dateDisplay.textContent = `選択された日付: ${targetDate.replace(/-/g, '/')}`;
    }

    // 2. Firestoreから過去の保存データを取得して入力欄に復元
    try {
        const existingData = await getDailyData(targetDate);
        if (existingData && existingData.meal) {
            console.log(`[データ復元] ${targetDate} の食事データを読み込みました`, existingData.meal);
            
            const meal = existingData.meal;
            // 朝食の復元
            if (meal.breakfast) {
                document.getElementById('breakfast_menu').value = meal.breakfast.menu || "";
                document.getElementById('breakfast_really_time').value = meal.breakfast.time || "";
            }
            // 昼食の復元
            if (meal.lunch) {
                document.getElementById('lunch_menu').value = meal.lunch.menu || "";
                document.getElementById('lunch_really_time').value = meal.lunch.time || "";
            }
            // 夕食の復元
            if (meal.dinner) {
                document.getElementById('dinner_menu').value = meal.dinner.menu || "";
                document.getElementById('dinner_really_time').value = meal.dinner.time || "";
            }
        } 
    } catch (error) {
        console.error("データの復元（読み込み）に失敗しました:", error);
    }
});

// 「1日の記録を終了して確定する」ボタン（または「記録確定」ボタン）が押されたときの保存イベント
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

        // 日付パラメータを維持したままホーム（index.html）に戻る
        window.location.href = `frontEnd/src/index.html?date=${targetDate}`;
    } catch (error) {
        console.error("食事データの保存に失敗しました:", error);
        alert("エラーが発生しました。コンソールを確認してください。");
    }
});



//--------------------[機能1]タイトル画面のアプリに遷移するボタンの動作------------------//

//ボタン変数の宣言
const backAppBtn = document.getElementById('back_app_btn');/*HTMLの「＜」テキストをJavaScriptで取得*/

//「＜」テキスト(ボタン)がクリックされたときの動作
backAppBtn.addEventListener('click', () => {
    window.location.href = 'frontEnd/src/index.html'; /*タイトル画面に遷移させる。htmlが同じフォルダになかったのでパスを指定。*/
});

//-------------------------[機能2]食事回数のカウント-------------------------//

//食事が記録されたかどうかチェックする関数。朝昼夕全てこれを使う。
//id名が食事ごとに違うが似ているので引数名mealTypeでカバーする。
function checkMeal(mealType){
    //食事開始時刻が入力されているかを取得
    let timeInput = document.getElementById(`${mealType}_really_time`);

    //献立が入力されているかを取得
    let menuInput = document.getElementById(`${mealType}_menu`);

    //栄養素が入力されているかを取得
    let nutrientsInput = document.querySelectorAll(`#${mealType}_nutrients input[type="checkbox"]:checked`);

    //上3つの項目が全て記入されてる状態であったら食事をしたと見なす。
    if((timeInput.value != "") && (menuInput.value != "") && (nutrientsInput.length > 0)){
        return true;//食事が記録されたと見なす。
    }
    else{
        return false;//食事が記録されたと見なさない。
    }
}

//食事回数をカウントする関数。
function countMeals(){
    let count = 0;//食事回数をカウントする変数。

    //朝昼夕の食事がされたかどうかの変数を用意。上のCheckMeal関数の呼び出し。
    let isBreakfastChecked = checkMeal('breakfast');//朝食が記録されたかどうかを取得。引数に'breakfast'を入れることで朝食の入力欄をチェックする。
    let isLunchChecked = checkMeal('lunch');//昼食が記録されたかどうかを取得。引数に'lunch'を入れることで昼食の入力欄をチェックする。
    let isDinnerChecked = checkMeal('dinner');//夕食が記録されたかどうかを取得。引数に'dinner'を入れることで夕食の入力欄をチェックする。

    //朝昼夕の食事がされたかどうかの条件分岐。
    if(isBreakfastChecked){//朝
        count++;
    }
    if(isLunchChecked){//昼
        count++;
    }
    if(isDinnerChecked){//夕
        count++;
    }

    return count;//食事回数を返す。
}

//-------------------------[機能3]不足栄養素を見つける-------------------------//
//現時点での不足栄養素を求める関数
function lackNutrients(){
    //デフォルトの状態だと何も摂取してないので全ての栄養素が不足していると考えて良い。
    //不足栄養素を入れる配列を用意。初期値は5つの栄養素全て。
    let lackNutrientsArray = ["炭水化物", "タンパク質", "脂質", "ビタミン", "ミネラル"];

    //朝食で摂取した栄養素を取得。
    let breakfastNutrients = document.querySelectorAll('#breakfast_nutrients input[type="checkbox"]:checked');

    //朝食で摂取した栄養素の中に、lackNutrientsArrayに入っている栄養素があったら、その栄養素は不足していないと見なす。なのでlackNutrientsArrayから削除する。
    //forEachで朝食で摂取した栄養素を1つずつ見ていく。boxという配列を用意しbreakfastNutrientsの中身を1つずつ入れていく(配列要素の走査)。
    breakfastNutrients.forEach(box => {
        let nutrients = box.value;//breakfastNutrientsの中身のデータを取り出す。

        //上で取得したデータがlackNutrientsArray配列の何番目の要素なのかを取得。取得できなかったら-1が返る。
        let index = lackNutrientsArray.indexOf(nutrients);

        //取得したデータの栄養素がまだ取得してない状態にあった場合。
        if(index !== -1){//要素番号を取得できた場合。
            //lackNutrientsArrayの中から取得したデータの栄養素を削除する。index番目の要素を1つ削除する。
            lackNutrientsArray.splice(index, 1);
        }
    });

    //昼食で摂取した栄養素を取得。
    let lunchNutrients = document.querySelectorAll('#lunch_nutrients input[type="checkbox"]:checked');

    //昼食で摂取した栄養素の中に、lackNutrientsArrayに入っている栄養素があったら、その栄養素は不足していないと見なす。なのでlackNutrientsArrayから削除する。
    lunchNutrients.forEach(box => {
        let nutrients = box.value;//lunchNutrientsの中身のデータを取り出す。

        //上で取得したデータがlackNutrientsArray配列の何番目の要素なのかを取得。取得できなかったら-1が返る。
        let index = lackNutrientsArray.indexOf(nutrients);

        //取得したデータの栄養素がまだ取得してない状態にあった場合。
        if(index !== -1){//要素番号を取得できた場合。
            //lackNutrientsArrayの中から取得したデータの栄養素を削除する。index番目の要素を1つ削除する。
            lackNutrientsArray.splice(index, 1);
        }
    });

    //夕食で摂取した栄養素を取得。
    let dinnerNutrients = document.querySelectorAll('#dinner_nutrients input[type="checkbox"]:checked');

    //夕食で摂取した栄養素の中に、lackNutrientsArrayに入っている栄養素があったら、その栄養素は不足していないと見なす。なのでlackNutrientsArrayから削除する。
    dinnerNutrients.forEach(box => {
        let nutrients = box.value;//dinnerNutrientsの中身のデータを取り出す。

        //上で取得したデータがlackNutrientsArray配列の何番目の要素なのかを取得。取得できなかったら-1が返る。
        let index = lackNutrientsArray.indexOf(nutrients);

        //取得したデータの栄養素がまだ取得してない状態にあった場合。
        if(index !== -1){//要素番号を取得できた場合。
            //lackNutrientsArrayの中から取得したデータの栄養素を削除する。index番目の要素を1つ削除する。
            lackNutrientsArray.splice(index, 1);
        }
    });
    //ここでまだlackNutrientsArrayに残っている栄養素は、朝昼夕のどの食事でも摂取されていない栄養素なので、不足していると見なすことができる。

    return lackNutrientsArray;//不足栄養素を返す。
}

//-------------------------[機能4]記録保存ボタンの動作-------------------------//
//記録保存ボタンをHTMLから取得
const finishBtn = document.getElementById('save_records_btn');

//記録保存ボタンがクリックされたときの動作（ここで全体の指揮をとる）
finishBtn.addEventListener('click', () => {

    //-------------------------[機能5]食事回数を表示-------------------------//
    //食事回数のカウントをする関数を呼び出す。これで食事回数が取得できた。
    let todayMealCount = countMeals();

    //食事回数を表示するテキストを取得する。
    let mealCountText = document.getElementById('meal_count');
    //食事回数を更新し表示する。
    mealCountText.textContent = `本日の食事回数: ${todayMealCount}回`;

    //-------------------------[機能6]不足栄養素を表示-------------------------//
    let lackNutrientsArray = lackNutrients();//不足栄養素を求める関数を呼び出す。これで不足栄養素の配列が取得できた。

    //不足栄養素を表示するテキストを取得する。
    let lackNutrientsText = document.getElementById('lack_nutrients');

    if(lackNutrientsArray.length > 0){//不足栄養素がある場合。
        //不足栄養素を更新し表示する。配列を文字列に変換して表示する。.join(', ')で配列の要素をカンマ区切りの文字列に変換する。
        lackNutrientsText.textContent = `本日の不足栄養素: ${lackNutrientsArray.join(', ')}`;
    }

    else{//不足栄養素がない場合。
        //不足栄養素がないことを表示する。
        lackNutrientsText.textContent = `本日の不足栄養素: なし`;
    }

    //-------------------------[機能7]栄養素とかdisabled化などの処理はここから-------------------------//
});