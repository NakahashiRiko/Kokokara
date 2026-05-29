// SleepApp.js
import { saveDailyData, getDailyData } from '../services/healthService.js';
import { loginAnonymously } from '../services/authService.js';

// URLから日付を自動キャッチ（なければ日本時間の本日の日付）
const urlParams = new URLSearchParams(window.location.search);
const targetDate = urlParams.get('date') || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

// 画面が読み込まれた時の初期化処理
document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. HTML側の表示を今回の対象日に合わせる
    setTimeout(() => {
        const todayDateEl = document.getElementById("todayDate");
        if (todayDateEl) {
            todayDateEl.textContent = `対象日: ${targetDate.replace(/-/g, '/')}`;
        }
    }, 100);

    // 2. 左上の「＜」ボタンの戻り先をセット
    const backBtn = document.querySelector('.back-button');
    if (backBtn) {
        backBtn.setAttribute('href', `index.html?date=${targetDate}`);
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

    // 5.HTMLの関数をフックするのではなく、ボタンのクリックイベントを直接監視する
    const sleepBtn = document.getElementById("button");
    if (sleepBtn) {
        console.log("🎯 ボタン(id='button')の監視を開始しました。");

        sleepBtn.addEventListener("click", () => {
            // モードを判定するために、クリックされた瞬間のボタンのテキストを即座に取得
            const currentBtnText = sleepBtn.textContent.trim();
            
            // HTML側でクリアされる前に、入力された起床時間を事前にキープ
            const wakeInput = document.getElementById("wakeInput");
            const preInputValue = wakeInput ? wakeInput.value : "";

            console.log(`クリック検知 - 現在のボタン: "${currentBtnText}", 入力値: "${preInputValue}"`);

            // ボタンが「記録する」の状態で押されたときだけ、保存処理を発動させる
            if (currentBtnText === "記録する") {
                if (preInputValue === "") {
                    console.log("⚠️ 起床時間が空欄のため、保存処理をスキップします。");
                    return;
                }

                // HTML側のタイマー計算処理（画面の書き換え）が完了するのを150ミリ秒だけ待つ
                setTimeout(async () => {
                    console.log("📝 記録完了を検知。Firestoreへの保存を開始します...");

                    // HTML側が計算して画面に出力した「〇〇時間〇〇分」から数字を逆算
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
                    const bedTimeResult = document.getElementById("bedTimeResult").textContent;

                    try {
                        const sleepDataObj = {
                            sleep: {
                                hour: hours,         
                                minute: minutes,
                                waketime: preInputValue, // バックアップしておいた起床時間
                                bedtime: bedTimeResult   // 逆算された就寝時刻
                            }
                        };

                        // Firestoreへ自動保存
                        await saveDailyData(targetDate, sleepDataObj);
                        console.log("✅ Firestoreへの保存が正常に完了しました。");
                        
                        // コメント（アラート）を表示
                        alert(`✅ ${targetDate} の睡眠データを保存しました！`);

                        // ホーム画面に戻る
                        window.location.href = `index.html?date=${targetDate}`;

                    } catch (error) {
                        console.error("❌ 睡眠データの自動保存に失敗しました:", error);
                        alert("データベースの保存に失敗しました。");
                    }
                }, 150);
            }
        });
    } else {
        console.error("❌ HTML側に id='button' の要素が見つかりません。インスペクターを確認してください。");
    }
});

/**
 * グラフを即時書き換える共通処理
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
 * Firestoreからデータを読み込んでフォームとグラフに復元する関数
 */
async function loadExistingSleepData() {
    try {
        const data = await getDailyData(targetDate);
        if (data && data.sleep) {
            const sleep = data.sleep;

            // 1. 起床時間と就寝時間のテキスト復元
            if (sleep.waketime) {
                const wakeInput = document.getElementById("wakeInput");
                if (wakeInput) wakeInput.value = sleep.waketime;
            }
            
            if (sleep.bedtime) {
                const bedTimeEl = document.getElementById("bedTimeResult");
                if (bedTimeEl) bedTimeEl.textContent = sleep.bedtime;
            }

            // 2. 計算結果テキストとコメントの復元
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

                // 3. 既存データがある場合のグラフ描画
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