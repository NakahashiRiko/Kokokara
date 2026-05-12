import { auth } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

/**
 * 匿名ログインを実行する関数
 */
export const loginAnonymously = async () => {
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user; // ログインしたユーザー情報を返す
  } catch (error) {
    console.error("匿名ログインに失敗しました:", error);
    throw error;
  }
};

/**
 * ログイン状態を監視する関数
 * (フロント側で「今誰がログイン中か」を知るために使います)
 */
export const observeAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};