import createCanvas from './canvas';
import { getDistance } from './math.utils';

function createGame({ canvasEl, onGameOver, highscore }) {
  let referenceDistance;

  let total = 0;
  let pointCount = 0;
  let startTime = 0;

  let centerPosition;

  let referenceRadius;
  let referenceRing;
  const startTolerance = 5 * devicePixelRatio;
  let faul;

  function onStartDrawing(point, api) {
    faul = false; // reset
    referenceDistance = getDistance(point, centerPosition);
    if (
      referenceDistance < referenceRadius - startTolerance ||
      referenceDistance > referenceRadius + startTolerance
    ) {
      faul = true;
      return;
    }
    total = 10000;
    startTime = Date.now();
    console.log('start', referenceDistance);
    referenceRing.animate('radius', 0, {
      duration: 200,
      onChange: api.canvas.renderAll.bind(api.canvas),
      // onComplete: function() {
      // },
      // easing: fabric.util.ease[document.getElementById('easing').value]
    });
  }

  function onMove(point) {
    if (faul) return;
    const distance = getDistance(point, centerPosition);
    const deviation = Math.abs(distance - referenceDistance);

    pointCount++;
    total -= parseInt(deviation, 10);
    if (total < 0) {
      total = 1;
    }
  }

  function onEnd(_, api) {
    const time = (Date.now() - startTime) / 1000;
    console.log('time', time);
    console.log('pointCount', pointCount);
    if (pointCount < 100) {
      api.reset();
      pointCount = 0;
      return;
    }
    referenceRing.animate('radius', referenceDistance, {
      duration: 400,
      onChange: api.canvas.renderAll.bind(api.canvas),
      onComplete: () => {
        if (faul) {
          return;
        }
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
    if (!highscore || highscore < total) {
      highscore = total;
    }

    if (pointCount > 230 && time < 5) {
      total += 1000 / time;
    }

    onGameOver({
      total: total.parseInt(),
      avg: (10000 - total) / pointCount,
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

    referenceRadius = Math.min(centerPosition.x, centerPosition.y) / 2;
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
