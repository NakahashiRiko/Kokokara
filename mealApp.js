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

//-------------------------[機能3]記録確定ボタンの動作-------------------------//
// 確定ボタンをHTMLから取得
const finishBtn = document.getElementById('finish_today_btn');

// 確定ボタンがクリックされたときの動作（ここで全体の指揮をとる）
finishBtn.addEventListener('click', () => {
    //-------------------------[機能4]食事回数を表示-------------------------//
    //食事回数のカウントをする関数を呼び出す。これで食事回数が取得できた。
    let todayMealCount = countMeals();

    //食事回数を表示するテキストを取得する。
    let mealCountText = document.getElementById('meal_count');
    //食事回数を更新し表示する。
    mealCountText.textContent = `本日の食事回数: ${todayMealCount}回`;

    //確定したことをユーザーに知らせるポップアップ
    //alert(`本日の食事回数 ${todayMealCount}回 で記録を確定しました！`);

    //-------------------------[機能4]栄養素とかdisabled化などの処理はここから-------------------------//
});