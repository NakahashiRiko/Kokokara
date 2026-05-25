// walk.js
import { saveDailyData } from '../services/healthService.js';

// URLから日付を自動キャッチして、selectedDayの代わりにヘッダーを上書き
const urlParams = new URLSearchParams(window.location.search);
const targetDate = urlParams.get('date') || new Date().toISOString().split('T')[0];

// HTML上の日付表示を、引き継いだ正しい日付に書き換え
document.getElementById("selectedDate").innerText = targetDate.replace(/-/g, "/");

// 画面を開いたときに既存のデータを読み込んでセット
document.addEventListener('DOMContentLoaded', async () => {
    await loadExistingWalkData();
});

/**
 * Firestoreから指定された日付の歩数データを取得し、画面に反映する関数
 */
async function loadExistingWalkData() {
    try {
        const data = await getDailyData(targetDate);
        if (data && data.walk) {
            const walk = data.walk;

            // 1. 目標歩数入力欄の復元
            if (walk.walkTarget !== undefined) {
                document.getElementById("targetInput").value = walk.walkTarget;
            }

            // 2. 今日の歩数表示の復元
            if (walk.steps !== undefined) {
                const todayStepEl = document.getElementById("todayStep");
                if (todayStepEl) {
                    todayStepEl.innerText = walk.steps + "歩";
                }
            }

            // 3. データが存在する場合は、既存のコメント計算・判定ロジックを1度走らせて画面表示を更新する
            updatePageWithSave();
        }
    } catch (error) {
        console.error("歩数データの読み込みに失敗しました:", error);
    }
}

/**
 * 既存の updatePage() 関数の最後に、
 * 目標歩数と現在の歩数をFirestoreにマージ保存する処理を追加します
 */
function updatePageWithSave() {
    // 1. まず元の計算・コメント書き換えロジックを走らせる
    let target = Number(document.getElementById("targetInput").value);
    
    // HTMLの「今日の歩数」テキストから数値だけを抜き出す ("4500歩" -> 4500)
    let currentSteps = parseInt(document.getElementById("todayStep").innerText) || 0;

    let diff = currentSteps - target;
    const commentEl = document.getElementById("comment");
    if (commentEl) {
        commentEl.innerText = diff >= 0 ?
            `今日の歩数は${currentSteps}歩です。\\n目標と${diff}歩の差があります。\\nおめでとうございます！\\nこれからも続けましょう！` :
            `今日の歩数は${currentSteps}歩です。\\n目標と${Math.abs(diff)}歩の差があります。\\nもっと頑張りましょう！`;
    }

    // 2.バックエンド追加：変更された瞬間にFirestoreへ自動保存
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
        console.log(`[Firestore] ${targetDate} の歩数データを自動保存しました。`);
    } catch (error) {
        console.error("歩数データの自動保存に失敗しました:", error);
    }
}

// HTML側の入力エリア（oninputなど）から呼び出せるようにグローバル展開
window.updatePageWithSave = updatePageWithSave;