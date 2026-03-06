import createGame from './game';
import './styles.css';

function renderHighScore(value: string | number): void {
  document.getElementById('highScore')!.innerHTML = `<label>best:</label> ${value}`;
}

function renderLastScore(value: string | number): void {
  document.getElementById('lastScore')!.innerHTML = `<label>last:</label> ${value}`;
}

function handleGameOver({ total, isHighcore }: { total: number; avg: number; isHighcore: boolean }): void {
  renderLastScore(total);
  if (isHighcore) {
    localStorage.setItem('highscore', String(total));
    renderHighScore(total);
  }
}

const highscore = localStorage.getItem('highscore');
if (highscore) {
  renderHighScore(highscore);
}

createGame({
  canvasEl: 'canvas',
  onGameOver: handleGameOver,
  highscore,
});
