document.addEventListener('DOMContentLoaded', () => {
  const goalForm = document.getElementById('goal-form');

  goalForm.addEventListener('submit', (event) => {
    // ページのリロードを防ぐ
    event.preventDefault();

    // 入力された値を取得
    const steps = document.getElementById('steps').value;
    
    const breakfast = `${document.getElementById('breakfast-hour').value}:${document.getElementById('breakfast-minute').value}`;
    const lunch = `${document.getElementById('lunch-hour').value}:${document.getElementById('lunch-minute').value}`;
    const dinner = `${document.getElementById('dinner-hour').value}:${document.getElementById('dinner-minute').value}`;

    // まとめたデータ（オブジェクト）
    const guestData = {
      role: 'guest',
      targetSteps: steps,
      mealTimes: {
        breakfast: breakfast,
        lunch: lunch,
        dinner: dinner
      }
    };

    // 一時的にブラウザ（SessionStorage）にデータを保存（次の画面で使うため）
    sessionStorage.setItem('guestGoalData', JSON.stringify(guestData));

    // テスト確認用のログ（開発ツールで確認できます）
    console.log('保存されたデータ:', guestData);

    // 次のメイン画面へ遷移（例として main.html にしています）
    window.location.href = '../index.html';
  });
});