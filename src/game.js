import createCanvas from './canvas';
import { getDistance } from './math.utils';

function createGame({ canvasEl, onGameOver }) {
  let referenceDistance;

  let total = 0;
  const totalDistance = 0;
  let pointCount = 0;

  let highscore;

  let centerPosition;

  function onStartDrawing(point, api) {
    api.reset();
    referenceDistance = getDistance(point, centerPosition);
    total = 0;
    console.log('start', referenceDistance);
  }

  function onMove(point) {
    const distance = getDistance(point, centerPosition);
    const deviation = Math.abs(distance - referenceDistance);

    pointCount++;
    total += parseInt(deviation, 10);
  }

  function onEnd(_, api) {
    if (pointCount < 30) {
      api.reset();
      pointCount = 0;
      return;
    }
    api.drawCircle({
      ...centerPosition,
      stroke: '#70C1B3',
      strokeWidth: 10,
      radius: referenceDistance,
    });
    if (!highscore || highscore > total) {
      highscore = total;
    }
    onGameOver({
      total,
      avg: total / pointCount,
      isHighcore: highscore === total,
    });
    pointCount = 0;
  }

  function init(canvas, api) {
    centerPosition = api.getCenter();
    canvas.clear();
    api.drawCircle({
      ...centerPosition,
      fill: '#50514F',
      strokeWidth: 10,
      radius: 20,
    });
  }

  createCanvas(canvasEl, {
    onMove,
    onStartDrawing,
    onEnd,
    init,
  });
}

export default createGame;
