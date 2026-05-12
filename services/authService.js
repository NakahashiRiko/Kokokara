// services/authService.js

// 🌟 重要：ブラウザから直接読み込むため、URL形式(CDN)でインポートします
import { auth } from './firebase.js'; 
import { 
    signInAnonymously, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

/**
 * 匿名ログインを実行する関数
 * フロントエンドの main.js から呼び出されます
 */
export async function loginAnonymously() {
    try {
        const result = await signInAnonymously(auth);
        const user = result.user;
        // ログイン成功時に、どのユーザーとしてログインしたかコンソールに表示
        console.log("匿名ログイン成功:", user.uid);
        return user;
    } catch (error) {
        console.error("匿名ログイン失敗:", error.code, error.message);
        throw error;
    }
}

/**
 * ログイン状態を監視する関数（必要に応じて使用）
 */
export function watchAuthState(callback) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // ログイン中
            callback(user);
        } else {
            // ログアウト状態
            callback(null);
        }
    });
}