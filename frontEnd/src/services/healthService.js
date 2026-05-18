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

  // 保存先のパスを指定：users/{uid}/dailyData/{date}
  const docRef = doc(db, "users", uid, "dailyData", date);

  // Firestoreへ書き込み（Map型構造）
  return await setDoc(docRef, {
    meal: {
      breakfast: {
        menu: data.breakfast.menu || "",
        time: data.breakfast.time || ""
      },
      lunch: {
        menu: data.lunch.menu || "",
        time: data.lunch.time || ""
      },
      dinner: {
        menu: data.dinner.menu || "",
        time: data.dinner.time || ""
      }
    },
    sleep: {
      hour: Number(data.sleep.hour) || 0,
      minute: Number(data.sleep.minute) || 0
    },
    walk: Number(data.walkSteps) || 0,
    updatedAt: serverTimestamp() // サーバー時刻を保存
  }, { merge: true }); // 既存データを消さずに更新
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