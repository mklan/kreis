import createGame from './game';
import './styles.css';

function renderHighScore(value) {
  document.getElementById('highScore').innerHTML = `<label>best:</label> ${value}`;
}

function renderLastScore(value) {
  document.getElementById('lastScore').innerHTML = `<label>last:</label> ${value}`;
}



function handleGameOver({ total, isHighcore }) {
  renderLastScore(total);
  if (isHighcore) {
    // Store
    localStorage.setItem("highscore", total);
    renderHighScore(total);
  }
}

const highscore = localStorage.getItem('highscore');
if(highscore){
  renderHighScore(highscore);
}


createGame({
  canvasEl: 'canvas',
  onGameOver: handleGameOver,
  highscore,
});
