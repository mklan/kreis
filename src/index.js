import createGame from './game';
import './styles.css';


function handleGameOver({ total, isHighcore }) {
  document.getElementById('lastScore').innerText = `last: ${total}`;
  if (isHighcore) {
    // Store
    localStorage.setItem("highscore", total);
    document.getElementById('highScore').innerText = `best: ${total}`;
  }
}

const highscore = localStorage.getItem('highscore');
if(highscore){
  document.getElementById('highScore').innerText = `best: ${highscore}`;
}


createGame({
  canvasEl: 'canvas',
  onGameOver: handleGameOver,
  highscore,
});
