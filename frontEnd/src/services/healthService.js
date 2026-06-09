import { db, auth } from './firebase.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
//追加
import { getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * 健康データを保存する関数
 * @param {string} date - "2026-05-12" 形式の日付
 * @param {object} data - フロントから渡される入力データ
 */
export const saveDailyData = async (date, data) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("ユーザーが認証されていません");

//現在時刻から30日後の日付を計算してタイムスタンプを作る
  const now = new Date();
  const expireDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // main.js から届いたデータに、自動消去用の「expireAt」を合体させて保存します
  return await setDoc(docRef, {
    ...data,
    expireAt: expireDate,         // 30日後を過ぎたら自動削除対象になる
    updatedAt: serverTimestamp()  // サーバー時刻を添える
  }, { merge: true }); // { merge: true } があるので既存の食事や睡眠データを壊さずにメモだけを追加保存できます
};

export const getDailyData = async (date) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("ユーザーが認証されていません");

  // 取得先のパスを指定（保存時と同じパス）
  const docRef = doc(db, "users", uid, "dailyData", date);

  try {
    // Firestoreからドキュメントを1件取得
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // データが存在すれば、中身をオブジェクトで返す
      console.log(`${date} のデータを取得しました:`, docSnap.data());
      return docSnap.data();
    } else {
      // データが存在しない場合
      console.log(`${date} のデータは見つかりませんでした。`);
      return null;
    }
  } catch (error) {
    console.error("データ取得エラー:", error);
    throw error;
  }
};