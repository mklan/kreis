import createGame from './game';
import './styles.css';

function handleGameOver({ total, isHighcore }) {
  document.getElementById('lastScore').innerText = `last: ${total}`;
  if (isHighcore) {
    document.getElementById('highScore').innerText = `best: ${total}`;
  }
}

createGame({
  canvasEl: 'canvas',
  onGameOver: handleGameOver,
});
