import { db, auth } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

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
        menu: data.breakfastMenu || "",
        time: data.breakfastTime || ""
      },
      lunch: {
        menu: data.lunchMenu || "",
        time: data.lunchTime || ""
      },
      dinner: {
        menu: data.dinnerMenu || "",
        time: data.dinnerTime || ""
      }
    },
    sleep: {
      hour: Number(data.sleepHour) || 0,
      minute: Number(data.sleepMinute) || 0
    },
    walk: Number(data.walkSteps) || 0,
    updatedAt: serverTimestamp() // サーバー時刻を保存
  }, { merge: true }); // 既存データを消さずに更新
};