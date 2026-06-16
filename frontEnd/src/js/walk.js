// walk.js
import { saveDailyData, getDailyData } from '/frontEnd/src/services/healthService.js';
import { loginAnonymously } from '/frontEnd/src/services/authService.js';

// URLから日付を自動キャッチ
const urlParams = new URLSearchParams(window.location.search);
const targetDate = urlParams.get('date') || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

// 画面が読み込まれた時の初期化処理
document.addEventListener('DOMContentLoaded', async () => {

    // 数字以外の入力を禁止
    const walkInput =
        document.getElementById("stepInput") ||
        document.getElementById("walkInput");

    if (walkInput) {
        walkInput.addEventListener("input", function () {
            this.value = this.value.replace(/[^0-9]/g, "");
        });
    }

    const selectedDateEl = document.getElementById("selectedDate");
    if (selectedDateEl) {
        const dateObj = new Date(targetDate);

const week = ["日","月","火","水","木","金","土"];

selectedDateEl.innerText =
    `${targetDate.replace(/-/g, "/")}（${week[dateObj.getDay()]}）`;
    }

     const sessionData = sessionStorage.getItem('guestGoalData');
    if (sessionData) {
        const guestData = JSON.parse(sessionData);
        if (guestData.targetSteps) {
            // もしwalk.js側で目標歩数を管理する変数（例: target）があればそこに代入
            if (typeof target !== 'undefined') {
                target = Number(guestData.targetSteps);
            }
            console.log(`🎯 ログイン画面から目標歩数を引き継ぎました: ${guestData.targetSteps}歩`);
            
            
            document.getElementById("targetStepDisplay").textContent = guestData.targetSteps;
        }
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
                savedSteps = Object.values(data.walk).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
            } else if (typeof data.walk === 'number') {
                savedSteps = data.walk;
            }
            document.getElementById("walkInput").value = savedSteps;
        }
    } catch (error) {
        console.error("❌ Firestoreからのデータ読み込みに失敗しました:", error);
    }
}
