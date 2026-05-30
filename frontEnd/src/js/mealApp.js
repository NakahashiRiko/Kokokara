// mealApp.js
import { saveDailyData } from '../services/healthService.js';

//URLの末尾から選択された日付を自動キャッチ
const urlParams = new URLSearchParams(window.location.search);
const targetDate = urlParams.get('date') || new Date().toISOString().split('T')[0];

// HTML上の日付テキストエリアを、選択された日付に書き換える（初期化処理）
document.addEventListener('DOMContentLoaded', () => {
    const dateDisplay = document.getElementById('date');
    if (dateDisplay) {
        dateDisplay.textContent = `日付: ${targetDate.replace(/-/g, '/')}`;
    }
});

// 「記録確定」ボタンが押されたときの保存イベント
document.getElementById('finish_today_btn').addEventListener('click', async () => {
    //--------------ここから変更して良い。----------------------//

    //記入漏れがあったら警告する関数checkUnfilledFields関数の呼び出し。
    //朝食の警告
    let breakfastError = checkUnfilledFields('breakfast', "朝食");//朝食の未記入欄があれば警告する関数を呼び出す。引数に'breakfast'を入れることで朝食の入力欄をチェックする。

    //昼食の警告
    let lunchError = checkUnfilledFields('lunch', "昼食");//昼食の未記入欄があれば警告する関数を呼び出す。引数に'lunch'を入れることで昼食の入力欄をチェックする。

    //夕食の警告
    let dinnerError = checkUnfilledFields('dinner', "夕食");//夕食の未記入欄があれば警告する関数を呼び出す。引数に'dinner'を入れることで夕食の入力欄をチェックする。

    //警告が出なければ保存処理に進む。どれか1つでも記入漏れがあればダメ。
    if(breakfastError || lunchError || dinnerError){
        return;//保存処理をストップ
    }

    //--------------ここまで変更して良い。----------------------//
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

//-------------------------[機能4]記録済みの内容をロックする-------------------------//
//記録済みの内容をロックする関数。引数に食事の種類を入れる。朝昼夕でそれぞれ呼び出す。
function lockMeal(mealType){
    //食事開始時刻をロック
    //その食事の食事開始時刻欄を取得。
    let timeInput = document.getElementById(`${mealType}_really_time`);

    //実際に入力済みであったらその食事の食事開始時刻欄をdisabledにする。
    if(timeInput.value != ""){//入力済みであった場合。
        timeInput.disabled = true;//disabledにする。
    }

    //献立をロック
    //その食事の献立欄を取得。
    let menuInput = document.getElementById(`${mealType}_menu`);

    //実際に入力済みであったらその食事の食事開始時刻欄をdisabledにする。
    if(menuInput.value != ""){//入力済みであった場合。
        menuInput.disabled = true;//disabledにする。
    }

    //栄養素をロック
    //その食事の中で「チェック済みのもの」だけを取得して数を調べる
    let checkedNutrients = document.querySelectorAll(`#${mealType}_nutrients input[type="checkbox"]:checked`);

    //もし1項目でもチェック済みであった場合
    if(checkedNutrients.length > 0){
        //今度はチェックの有無に関わらず、その食事のすべてのチェックボックスを取得し直す
        let allNutrientsInput = document.querySelectorAll(`#${mealType}_nutrients input[type="checkbox"]`);
        
        //すべてのボックスを一つずつdisabledにする。ロックする。
        allNutrientsInput.forEach(box => {
            box.disabled = true; 
        });
    }
}

//-------------------------[機能5]未記入欄があれば警告する-------------------------//
//食事に未記入の欄があれば警告する関数。朝昼夕でそれぞれ呼び出す。
function checkUnfilledFields(mealType, mealName){
    //入力状況を取得。
    let time = document.getElementById(`${mealType}_really_time`).value;//時刻
    let menu = document.getElementById(`${mealType}_menu`).value;//献立
    let nutrients = document.querySelectorAll(`#${mealType}_nutrients input[type="checkbox"]:checked`);//栄養素

    //その食事の記録欄が全て未記入の場合。食事をしていないから記録していないと思われるのでそれを確認する。
    if(time == "" && menu == "" && nutrients.length == 0){
        //confirmを使ってOKとキャンセルの選択肢を出す。OKを押すとtrue、キャンセルを押すとfalseとなる。
        let confirmCheck = confirm(`⚠️${mealName}の記録がされていません⚠️\n${mealName}を摂取していないならば\nOK\nを押してください。そのままで構いません。\n摂取したのであれば\nキャンセル\nを押して記入してください。`);
        if(confirmCheck){//OKが押された場合。摂取していないとみなし次に進む。
            return false;
        }
        else{//キャンセルが押された場合。摂取してるので記入を促し、また記録されてなかったら再び警告が出る。
            return true;
        }
    }

    //その食事で未記入の欄が全てではない場合(1つか2つが未記入)はただの記入漏れなので記入を促す。
    else{
        //後でまとめて警告するために未記入の内容を保存。
        let unfilledFields = [];
        //時刻が未記入の場合。
        if(time == ""){
            unfilledFields.push("時刻");
        }

        //献立が未記入の場合。
        if(menu == ""){
            unfilledFields.push("献立");
        }
        
        //栄養素が未記入の場合。
        if(nutrients.length == 0){
            unfilledFields.push("栄養素");
        }

        //上の処理で配列に入った要素があれば、記入漏れがあると見なして、記入を促す。
        if(unfilledFields.length > 0){
            alert(`⚠️記入漏れ⚠️\n${mealName}の\n${unfilledFields.join('と')}\nが記入されていません。`);
            return true;
        }

        //記入漏れがなかったら次に進む。
        return false;
    }
}

//-------------------------[機能6]記録保存ボタンの動作-------------------------//
//記録保存ボタンをHTMLから取得
const finishBtn = document.getElementById('save_records_btn');

//記録保存ボタンがクリックされたときの動作（ここで全体の指揮をとる）
finishBtn.addEventListener('click', () => {

    //-------------------------[機能7]食事回数と不足栄養素を合体させてコメント文を生成-------------------------//
    let todayMealCount = countMeals();//食事回数のカウントをする関数を呼び出す。これで食事回数が取得できた。
    let lackNutrientsArray = lackNutrients();//不足栄養素を求める関数を呼び出す。これで不足栄養素の配列が取得できた。
    let commentText = document.getElementById('comment');//コメント文を表示するフィールドを取得

    //栄養素が不足しているか、完璧かで1行のメッセージを出し分ける
    if(lackNutrientsArray.length > 0){
        commentText.textContent = `本日の食事は${todayMealCount}回でした。${lackNutrientsArray.join('・')}が不足気味なので、明日は摂取できるようにしましょう！`;
    } else {
        commentText.textContent = `本日の食事は${todayMealCount}回でした。栄養素はパーフェクトです！明日もこの調子でいきましょう！`;
    }

    //-------------------------[機能8]ボタンを押すとその時点で記入済みの内容をdisabledにする-------------------------//
    //朝昼夕の食事の内容をロックする関数を呼び出す。引数に食事の種類を入れる。朝昼夕でそれぞれ呼び出す。
    lockMeal('breakfast');//朝食の内容をロックする。
    lockMeal('lunch');//昼食の内容をロックする。
    lockMeal('dinner');//夕食の内容をロックする。
});