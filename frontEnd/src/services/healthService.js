import { db, auth } from './firebase.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * 健康データを保存する関数
 * @param {string} date - "2026-05-12" 形式の日付
 * @param {object} data - フロントから渡される入力データ
 */
export const saveDailyData = async (date, data) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("ユーザーが認証されていません");

  // 保存先のパスを指定：users/{uid}/dailyData/{date}
  const docRef = doc(db, "users", uid, "dailyData", date);

  // 【元の状態に戻しました】これでデータの保存が正常に動くようになります
  return await setDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp() // サーバー時刻だけを添える
  }, { merge: true });
};

//健康データを取得する関数（1ヶ月以上前のデータは除外）
export const getDailyData = async (date) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("ユーザーが認証されていません");

  // 取得先のパスを指定（保存時と同じパス）
  const docRef = doc(db, "users", uid, "dailyData", date);

  try {
    // Firestoreからドキュメントを1件取得
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // データの保存日時（updatedAt）があるか確認し、安全に日付オブジェクトに変換します
      if (data.updatedAt) {
        // Firestoreの特殊なタイムスタンプ、または通常のミリ秒数からDateオブジェクトを作成
        const updatedTime = typeof data.updatedAt.toDate === 'function' 
          ? data.updatedAt.toDate() 
          : new Date(data.updatedAt);

        // 30日前の境界線を計算
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // もし30日前よりも古い更新データであれば、画面に表示させない（初期化状態にする）
        if (updatedTime < thirtyDaysAgo) {
          console.log(`${date} のデータは30日以上前の古いデータなので、表示しません。`);
          return null; 
        }
      }

      // 30日以内のデータであれば通常通りフロント（main.js）に返す
      console.log(`${date} のデータを取得しました:`, data);
      return data;
    } else {
      console.log(`${date} のデータは見つかりませんでした。`);
      return null;
    }
  } catch (error) {
    console.error("データ取得エラー:", error);
    throw error;
  }
};