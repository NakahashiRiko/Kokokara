// walk.js
import { saveDailyData, getDailyData } from '/frontEnd/src/services/healthService.js';
import { loginAnonymously } from '/frontEnd/src/services/authService.js';

// URLから日付を自動キャッチ
const urlParams = new URLSearchParams(window.location.search);
const targetDate = urlParams.get('date') || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

// 画面が読み込まれた時の初期化処理
document.addEventListener('DOMContentLoaded', async () => {
    const selectedDateEl = document.getElementById("selectedDate");
    if (selectedDateEl) {
        selectedDateEl.innerText = targetDate.replace(/-/g, "/");
    }

    const backBtn = document.querySelector('.back');
    if (backBtn) {
        backBtn.setAttribute('href', `frontEnd/src/index.html?date=${targetDate}`);
    }

    try {
        const user = await loginAnonymously();
        if (user) {
            console.log("🔥 歩数画面でのFirebase接続成功！ UID:", user.uid);
            await loadExistingWalkData();
        }
    } catch (error) {
        console.error("❌ Firebaseログインに失敗しました:", error);
    }
});

/**
 * HTML側のボタンから呼び出される保存関数
 */
window.updateWalkFirestore = async function(step, target) {
    console.log(`📝 歩数データのFirestore自動保存を開始します... 歩数: ${step}`);

    try {
        const walkDataObj = {
            walk: step // main.jsの仕様（ただの数値）に合わせて保存
        };

        await saveDailyData(targetDate, walkDataObj);
        console.log(`[Firestore] ${targetDate} の歩数データを自動保存しました。`);
        alert(`✅ ${targetDate} の歩数データを保存しました！`);

        window.location.href = `frontEnd/src/index.html?date=${targetDate}`;
    } catch (error) {
        console.error("❌ 歩数データの自動保存に失敗しました:", error);
        alert("保存に失敗しました。コンソールを確認してください。");
    }
};

/**
 * Firestoreからデータを読み込んでフォームに復元する関数
 */
async function loadExistingWalkData() {
    try {
        const data = await getDailyData(targetDate);
        
        if (data && data.walk !== undefined && data.walk !== null) {
            let savedSteps = 0;
            if (typeof data.walk === 'object') {
                savedSteps = Number(data.walk.steps) || 0;
            } else {
                savedSteps = Number(data.walk);
            }

            const stepInput = document.getElementById("stepInput");
            if (stepInput) {
                stepInput.value = savedSteps;
            }

            console.log(`✅ Firestoreから歩数（${savedSteps}歩）を取得し、画面に復元しました。`);

            // 既存のHTML側のグラフ更新処理を呼び出す
            if (typeof window.updatePage === 'function') {
                window.updatePage();
            }
        }
    } catch (error) {
        console.error("❌ 既存の歩数データの読み込み・復元に失敗しました:", error);
    }
}