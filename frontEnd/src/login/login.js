// ログイン画面のスクリプト（login.jsなど）での記述例
import { loginWithGoogle } from './services/authService.js';

const googleBtn = document.getElementById('google-login-btn');

if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        try {
            await loginWithGoogle(); // ➔ これで上の追記した関数が走ります！
        } catch (error) {
            alert("ログインに失敗しました。詳細: " + error.message);
        }
    });
}