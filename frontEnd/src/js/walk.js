// walk.js
import { saveDailyData } from '../services/healthService.js';

// URLから日付を自動キャッチして、selectedDayの代わりにヘッダーを上書き
const urlParams = new URLSearchParams(window.location.search);
const targetDate = urlParams.get('date') || new Date().toISOString().split('T')[0];

// HTML上の日付表示を、引き継いだ正しい日付に書き換え
document.getElementById("selectedDate").innerText = targetDate.replace(/-/g, "/");

/**
 * 既存の updatePage() 関数の最後に、
 * 目標歩数と現在の歩数をFirestoreにマージ保存する処理を追加します
 */
const originalUpdatePage = window.updatePage; // 既存の関数があれば退避

function updatePageWithSave() {
    // 1. まずフロントの方が作った元の計算・コメント書き換えロジックを走らせる
    let target = Number(document.getElementById("targetInput").value);
    
    // HTMLの「今日の歩数」テキストから数値だけを抜き出す ("4500歩" -> 4500)
    let currentSteps = parseInt(document.getElementById("todayStep").innerText) || 0;

    let diff = currentSteps - target;
    document.getElementById("comment").innerText = diff >= 0 ?
        `今日の歩数は${currentSteps}歩です。\n目標と${diff}歩の差があります。\nおめでとうございます！\nこれからも続けましょう！` :
        `今日の歩数は${currentSteps}歩です。\n目標と${Math.abs(diff)}歩の差があります。\nもっと頑張りましょう！`;

    // 2. 🌟 バックエンド追加：変更された瞬間にFirestoreへ自動保存
    saveWalkToFirebase(currentSteps, target);
}

// Firebase保存用の内部関数
async function saveWalkToFirebase(steps, target) {
    try {
        const walkData = {
            walk: {
                steps: steps,
                walkTarget: target
            }
        };
        await saveDailyData(targetDate, walkData);
        console.log(`[Firestore] ${targetDate} の歩数データを自動更新しました: ${steps}/${target}歩`);
    } catch (error) {
        console.error("歩数データの保存エラー:", error);
    }
}

// 既存のイベントリスナーを新しい保存付きの関数に差し替える
document.getElementById("targetInput").removeEventListener("input", updatePage);
document.getElementById("targetInput").addEventListener("input", updatePageWithSave);

// 初回起動時にも1回保存を走らせる
updatePageWithSave();

//画面が開かれた瞬間に、URLから日付（?date=xxxx）を読み取って、その日のデータをデータベースから取得して入力欄にセットする
document.addEventListener("DOMContentLoaded", async () => {
    // 1. URLのパラメータから日付を取得する（なければ本日の日付をデフォルトにする）
    const urlParams = new URLSearchParams(window.location.search);
    let selectedDate = urlParams.get('date');
    
    if (!selectedDate) {
        // パラメータがない場合は、今日の日付（YYYY-MM-DD型）にする
        const today = new Date();
        selectedDate = today.toISOString().split('T')[0];
    }

    // 画面上の「選択された日付：2026/05/25」などのテキスト表示を更新
    const dateDisplay = document.getElementById("date-display"); // HTML側に該当のidがあると仮定
    if (dateDisplay) {
        dateDisplay.textContent = selectedDate.replace(/-/g, '/');
    }

    // 2. データベースからその日のデータを読み込んで入力欄にセットする（③・⑤の処理）
    await loadAndSpreadWalkData(selectedDate);
});

// データを読み込んで画面に反映する関数
async function loadAndSpreadWalkData(date) {
    try {
        // データベースからデータを取得（saveDailyDataの対になる読み込み関数があると仮定）
        // const dailyData = await getDailyData(date); 
        
        // テスト用のダミーデータ（実際はDBから取得した dailyData を使います）
        const mockData = { walk: 2248, walkTarget: 5000 }; 

        if (mockData) {
            // HTMLの歩数入力欄（<input>）に数値をセットする
            const walkInput = document.getElementById("walk-input"); // 歩数入力欄のid
            const targetInput = document.getElementById("target-input"); // 目標入力欄のid
            
            if (walkInput) walkInput.value = mockData.walk || "";
            if (targetInput) targetInput.value = mockData.walkTarget || "";
            
            console.log(`${date} のデータを入力欄にセットしました。`);
        }
    } catch (error) {
        console.error("データの読み込みに失敗しました:", error);
    }
}