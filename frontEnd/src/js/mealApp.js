// mealApp.js
import { saveDailyData } from '../services/healthService.js';

//URLの末尾から選択された日付を自動キャッチ
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

        window.location.href = `index.html?date=${targetDate}`;//パラメータをつける
        
        // 保存後、自動でホーム画面に戻る場合は以下を有効にしてください
        // window.location.href = 'index.html';
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

//-------------------------[機能3]記録保存ボタンの動作-------------------------//
//記録保存ボタンをHTMLから取得
const finishBtn = document.getElementById('save_records_btn');

//記録保存ボタンがクリックされたときの動作（ここで全体の指揮をとる）
finishBtn.addEventListener('click', () => {
    //-------------------------[機能4]食事回数を表示-------------------------//
    //食事回数のカウントをする関数を呼び出す。これで食事回数が取得できた。
    let todayMealCount = countMeals();

    //食事回数を表示するテキストを取得する。
    let mealCountText = document.getElementById('meal_count');
    //食事回数を更新し表示する。
    mealCountText.textContent = `本日の食事回数: ${todayMealCount}回`;

    //記録を保存したことをユーザーに知らせるポップアップ
    //alert(`本日の食事回数 ${todayMealCount}回 で記録を保存しました！`);

    //-------------------------[機能4]栄養素とかdisabled化などの処理はここから-------------------------//
});