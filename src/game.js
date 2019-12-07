import createCanvas from './canvas';
import { getDistance } from './math.utils';

function createGame({ canvasEl, onGameOver }) {
  let referenceDistance;

  let total = 0;
  const totalDistance = 0;
  let pointCount = 0;

  let highscore;

  let centerPosition;

  const referenceRadius = 110;
  let referenceRing;

  function onStartDrawing(point, api) {
    referenceDistance = getDistance(point, centerPosition);
    if (
      referenceDistance < referenceRadius - 5 ||
      referenceDistance > referenceRadius + 5
    ) {
      api.disableDrawing(true);
      return;
    }
    total = 0;
    console.log('start', referenceDistance);
    referenceRing.animate('radius', 0, {
      duration: 200,
      onChange: api.canvas.renderAll.bind(api.canvas),
      // onComplete: function() {
      //   animateBtn.disabled = false;
      // },
      // easing: fabric.util.ease[document.getElementById('easing').value]
    });
  }

  function onMove(point) {
    const distance = getDistance(point, centerPosition);
    const deviation = Math.abs(distance - referenceDistance);

    pointCount++;
    total += parseInt(deviation, 10);
  }

  function onEnd(_, api) {
    console.log('pointCount', pointCount);
    if (pointCount < 30) {
      api.reset();
      pointCount = 0;
      return;
    }
    referenceRing.animate('radius', referenceDistance, {
      duration: 400,
      onChange: api.canvas.renderAll.bind(api.canvas),
      onComplete: () => {
        referenceRing.stroke = '#70C1B3';
        referenceRing.animate('strokeWidth', 10, {
          duration: 200,
          onChange: api.canvas.renderAll.bind(api.canvas),
          // onComplete: function() {
          //   animateBtn.disabled = false;
          // },
          // easing: fabric.util.ease[document.getElementById('easing').value]
        });
      },
      // easing: fabric.util.ease[document.getElementById('easing').value]
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

  function createInitialScene(api) {
    centerPosition = api.getCenter();
    api.canvas.clear();
    api.drawCircle({
      ...centerPosition,
      fill: '#50514F',
      strokeWidth: 10,
      radius: 20,
    });

    // referenceRadius
    referenceRing = api.drawCircle({
      ...centerPosition,
      stroke: '#50514F',
      strokeWidth: 1,
      radius: referenceRadius,
    });
  }

  createCanvas(canvasEl, {
    onMove,
    onStartDrawing,
    onEnd,
    init: createInitialScene,
  });
}

export default createGame;
