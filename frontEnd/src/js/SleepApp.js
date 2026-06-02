// SleepApp.js
import { saveDailyData, getDailyData } from '../services/healthService.js';
import { loginAnonymously } from '../services/authService.js';

// URLから日付を自動キャッチ（HTML側と基準を合わせる）
const urlParams = new URLSearchParams(window.location.search);
let targetDate = urlParams.get('date');

if (!targetDate) {
    const now = new Date();
    targetDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 画面が読み込まれた時の初期化処理
document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. HTML側の表示を今回の対象日に合わせる
    setTimeout(() => {
        const todayDateEl = document.getElementById("todayDate");
        if (todayDateEl) {
            // 表示を整える処理はHTML側で行っているため、ここではFirestoreとの日付同期確認のみ
            console.log("📅 選択中データ対象日:", targetDate);
        }
    }, 100);

    // 2. 左上の「＜」ボタンの戻り先をセット（パスの修正：frontEnd/src/ を削除）
    const backBtn = document.querySelector('.back-button');
    if (backBtn) {
        backBtn.setAttribute('href', `frontEnd/src/index.html?date=${targetDate}`);
    }

    // 3. Firebase匿名ログインを実行
    try {
        const user = await loginAnonymously();
        if (user) {
            console.log("🔥 睡眠画面でのFirebase接続成功！ UID:", user.uid);
            
            // 4. 既存データをFirestoreから読み込んで復元
            await loadExistingSleepData();
        }
    } catch (error) {
        console.error("❌ Firebaseログインに失敗しました:", error);
    }
});
//ここまで変更

/**
 * タイミングのズレを完全に無くすため、HTML側の計算直後にデータを受け取って即実行します。
 */
window.saveToFirestoreViaJS = async function(passedWakeTime, passedBedTime) {
    console.log("📝 HTML側からの呼び出しに成功。Firestoreへの保存を開始します...");
    console.log(`引数チェック - 起床時間: ${passedWakeTime}, 就寝時刻: ${passedBedTime}`);

    // 画面に確定表示されている「〇〇時間〇〇分」から数字を逆算して抽出
    const sleepResultText = document.getElementById("sleepResult").textContent;
    let totalMinutes = 0;
    
    if (sleepResultText && sleepResultText.includes("時間")) {
        const match = sleepResultText.match(/(\d+)時間(\d+)分/);
        if (match) {
            const h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            totalMinutes = (h * 60) + m;
        }
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    try {
        const sleepDataObj = {
            sleep: {
                hour: hours,         
                minute: minutes,
                waketime: passedWakeTime, 
                bedtime: passedBedTime   
            }
        };

        // Firestoreへ自動保存
        await saveDailyData(targetDate, sleepDataObj);
        console.log("✅ Firestoreへの保存が正常に完了しました。");
        
        // グラフをその場で同期更新
        updateLocalChart(hours + (minutes / 60));

        // アラートを表示して、カレンダー（ホーム）へ日付付きで戻る
        alert(`✅ ${targetDate} の睡眠データを保存しました！`);
        window.location.href = `frontEnd/src/index.html?date=${targetDate}`;

    } catch (error) {
        console.error("❌ 睡眠データの自動保存に失敗しました:", error);
        alert("データベースの保存に失敗しました。");
    }
};

/**
 * グラフを即時書き換える処理
 */
function updateLocalChart(totalHours) {
    const ctx = document.getElementById('sleepChart');
    if (ctx) {
        const chartInstance = Chart.getChart(ctx);
        if (chartInstance) {
            const selectedDateObj = new Date(targetDate);
            const dayOfWeek = selectedDateObj.getDay(); 

            chartInstance.data.datasets[0].data[dayOfWeek] = Math.round(totalHours * 10) / 10;
            chartInstance.update();
        }
    }
}

/**
 * Firestoreからデータを読み込んで復元する関数
 */
async function loadExistingSleepData() {
    try {
        const data = await getDailyData(targetDate);
        if (data && data.sleep) {
            const sleep = data.sleep;

            if (sleep.waketime) {
                const wakeInput = document.getElementById("wakeInput");
                if (wakeInput) wakeInput.value = sleep.waketime;
            }
            
            if (sleep.bedtime) {
                const bedTimeEl = document.getElementById("bedTimeResult");
                if (bedTimeEl) bedTimeEl.textContent = sleep.bedtime;
            }

            if (sleep.hour !== undefined && sleep.minute !== undefined) {
                const h = String(sleep.hour).padStart(2, '0');
                const m = String(sleep.minute).padStart(2, '0');
                
                const sleepResultEl = document.getElementById("sleepResult");
                if (sleepResultEl) sleepResultEl.textContent = `${h}時間${m}分`;
                
                let advice = "理想的な睡眠時間です。この生活リズムを維持しましょう。";
                const totalHours = sleep.hour + (sleep.minute / 60);
                if (totalHours < 6) {
                    advice = "睡眠時間が不足しています。十分な休息を取りましょう。";
                } else if (totalHours > 9) {
                    advice = "睡眠時間が長めです。生活リズムも意識してみましょう。";
                } else if (totalHours >= 6 && totalHours < 7) {
                    advice = "あと少し睡眠時間を増やすとより良いです。";
                }
                
                const commentEl = document.getElementById("comment");
                if (commentEl) {
                    commentEl.textContent = `今日の睡眠時間は${h}時間${m}分です。\n${advice}`;
                }

                updateLocalChart(totalHours);
                
                const statusDisplay = document.getElementById("statusDisplay");
                if (statusDisplay) {
                    statusDisplay.textContent = "本日の睡眠は記録済みです。";
                }
            }
        }
    } catch (error) {
        console.error("❌ 睡眠データの読み込みに失敗しました:", error);
    }
}