// walk.js
import { saveDailyData, getDailyData } from '../services/healthService.js';
import { loginAnonymously } from '../services/authService.js';

// URLから日付を自動キャッチ（なければ本日の日付）
const urlParams = new URLSearchParams(window.location.search);
const targetDate = urlParams.get('date') || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]; // 日本時間

// 画面が読み込まれた時の初期化処理
document.addEventListener('DOMContentLoaded', async () => {
    // 1. ヘッダーの日付表示を更新（「2026/05/25」形式）
    const selectedDateEl = document.getElementById("selectedDate");
    if (selectedDateEl) {
        selectedDateEl.innerText = targetDate.replace(/-/g, "/");
    }

    // 2. 左上の「＜」ボタンの戻り先を動的にセット
    const backBtn = document.querySelector('.back');
    if (backBtn) {
        backBtn.setAttribute('href', `frontEnd/src/index.html?date=${targetDate}`);
    }

    // 3. Firebase匿名ログインを実行
    try {
        const user = await loginAnonymously();
        if (user) {
            console.log("🔥 歩数画面でのFirebase接続成功！ UID:", user.uid);
            
            // 4. ログイン成功後に、既存データをFirestoreから読み込んで復元
            await loadExistingWalkData();
        }
    } catch (error) {
        console.error("❌ Firebaseログインに失敗しました:", error);
    }
});

/**
 * 🌟【機能①】HTML側の元の updatePage を横からキャッチして、
 * 計算処理が終わった直後にFirestoreへ保存する仕組み（フック）
 */
// HTML側の元の関数を変数に退避させる
const originalUpdatePage = window.updatePage;

// window.updatePage を新しく作り直して上書きする
window.updatePage = async function() {
    
    // 1. まずHTML側に書かれている元の計算やローカルストレージへの保存、コメント書き換え、グラフ更新をそのまま実行
    if (typeof originalUpdatePage === 'function') {
        originalUpdatePage();
    }

    // 2. HTMLの入力欄（targetInput と stepInput）から最新の数値を回収
    let target = Number(document.getElementById("targetInput").value) || 0;
    let step = Number(document.getElementById("stepInput").value) || 0;

    // 3. Firestoreへデータを自動保存（main.jsのデータ構造に統一）
    try {
        const walkDataObj = {
            walk: {
                steps: step,          // main.js側で読み込むプロパティ名
                walkTarget: target    // main.js側で読み込むプロパティ名
            }
        };

        await saveDailyData(targetDate, walkDataObj);
        console.log(`[Firestore] ${targetDate} の歩数データを自動保存しました。`);
        alert(`✅ ${targetDate} の歩数データを保存しました！`);

        // 保存が成功したら、日付を引き継いでホーム画面に戻る
        window.location.href = `frontEnd/src/index.html?date=${targetDate}`;

    } catch (error) {
        console.error("❌ 歩数データの自動保存に失敗しました:", error);
        alert("保存に失敗しました。コンソールを確認してください。");
    }
};

/**
 * 🌟【機能②】Firestoreからデータを読み込んでフォームに復元する関数
 */
async function loadExistingWalkData() {
    try {
        const data = await getDailyData(targetDate);
        if (data && data.walk) {
            const walk = data.walk;

            // 1. 目標歩数の入力欄に復元
            if (walk.walkTarget !== undefined) {
                document.getElementById("targetInput").value = walk.walkTarget;
            }

            // 2. 今日の歩数入力欄に復元
            if (walk.steps !== undefined) {
                document.getElementById("stepInput").value = walk.steps;
            }

            // 3. データが存在する場合は、HTML側の画面更新処理を1度走らせてコメントやグラフを最新にする
            if (typeof originalUpdatePage === 'function') {
                originalUpdatePage();
            }
        }
    } catch (error) {
        console.error("❌ 歩数データの読み込みに失敗しました:", error);
    }
}