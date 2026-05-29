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

    // 5.
    // id="button" がなくても、class="btn" から確実に要素を捕まえます
    const sleepBtn = document.getElementById("button") || document.querySelector(".btn");
    
    if (sleepBtn) {
        console.log("Target Button Loaded Successfully!");

        sleepBtn.addEventListener("click", () => {
            // クリックされた瞬間のテキストと起床入力欄の値を退避
            const currentBtnText = sleepBtn.textContent.trim();
            const wakeInput = document.getElementById("wakeInput");
            const preInputValue = wakeInput ? wakeInput.value : "";

            console.log(`[Click!]: "${currentBtnText}", Input: "${preInputValue}"`);

            // ボタンが「記録する」の状態で押された時だけ、Firestoreへの保存処理を走らせる
            if (currentBtnText === "記録する") {
                if (preInputValue === "") {
                    console.log("⚠️ 起床時間が空欄のため、保存処理へは進みません。");
                    return;
                }

                // HTML側のタイマー・画面初期化処理が終わるのを少しだけ待つ
                setTimeout(async () => {
                    console.log("📝 記録完了を検知。Firestoreへの保存を開始します...");

                    // 画面に計算・出力された「〇〇時間〇〇分」から数値を解析
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
                        
                        // アラートを表示してホームへ戻る
                        alert(`✅ ${targetDate} の睡眠データを保存しました！`);
                        window.location.href = `index.html?date=${targetDate}`;

                    } catch (error) {
                        console.error("❌ 睡眠データの自動保存に失敗しました:", error);
                        alert("データベースの保存に失敗しました。");
                    }
                }, 150);
            }
        });
    } else {
        console.error("❌ ボタン要素（ID: button または Class: btn）が見つかりません。");
    }
});

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