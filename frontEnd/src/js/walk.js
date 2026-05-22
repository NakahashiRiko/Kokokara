// walk.js
import { saveDailyData } from '../services/healthService.js';

// 🌟 URLから日付を自動キャッチして、selectedDayの代わりにヘッダーを上書き
const urlParams = new URLSearchParams(window.location.search);
const targetDate = urlParams.get('date') || new Date().toISOString().split('T')[0];

// HTML上の日付表示を、引き継いだ正しい日付に書き換え
document.getElementById("selectedDate").innerText = targetDate.replace(/-/g, "/");

/**
 * 💡 既存の updatePage() 関数の最後に、
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
            walk: steps,
            walkTarget: target
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