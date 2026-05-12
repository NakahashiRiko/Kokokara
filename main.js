// main.js
import { loginAnonymously } from './services/authService.js';

async function initApp() {
    console.log("システム初期化中...");
    
    try {
        // アプリ起動時に自動で匿名ログインを実行
        const user = await loginAnonymously();
        
        if (user) {
            console.log("🔥 Firebase接続成功！");
            console.log("ユーザーUID:", user.uid);
            // ここまで来れば、データの保存機能（saveDailyData）などが使える状態です
        }
    } catch (error) {
        console.error("❌ 初期化エラー:", error);
    }
}

// アプリの起動
initApp();