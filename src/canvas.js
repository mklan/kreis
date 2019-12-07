import { fabric } from 'fabric';

let mouseDown = false;

function createCanvas(
  canvasEl,
  {
    onStartDrawing = () => {},
    onMove = () => {},
    onEnd = () => {},
    init = () => {},
  },
) {
  fabric.Object.prototype.selectable = false;
  fabric.Object.prototype.transparentCorners = false;

  const canvas = new fabric.Canvas(canvasEl, {
    isDrawingMode: true,
  });

  canvas.freeDrawingBrush.color = '#F25F5C';
  canvas.freeDrawingBrush.width = 10;

  let containerSize = {
    width: document.getElementById('canvas-container').offsetWidth,
    height: document.getElementById('canvas-container').offsetHeight,
  };

  function fitResponsiveCanvas() {
    containerSize = {
      width: document.getElementById('canvas-container').offsetWidth,
      height: document.getElementById('canvas-container').offsetHeight,
    };
    canvas.setWidth(containerSize.width);
    canvas.setHeight(containerSize.height);
    canvas.setZoom(1);
  }

  fitResponsiveCanvas();
  window.onresize = fitResponsiveCanvas;

  function getCenter() {
    return { x: containerSize.width / 2, y: containerSize.height / 2 };
  }

  function drawCircle({ x, y, fill, stroke, strokeWidth, radius }) {
    const circle = new fabric.Circle({
      fill,
      stroke,
      strokeWidth,
      radius,
      left: x,
      top: y,
      centeredScaling: true,
      originX: 'center',

      originY: 'center',
    });

    canvas.add(circle);
    canvas.sendToBack(circle);
    return circle;
  }

  const api = {
    getCenter,
    drawCircle,
    reset,
    canvas,
  };

  function reset() {
    canvas.clear();
    init(api);
  }

  canvas.on('mouse:down', ({ pointer }) => {
    reset();
    onStartDrawing(pointer, api);
    mouseDown = true;
  });
  canvas.on('mouse:up', ({ pointer }) => {
    mouseDown = false;
    onEnd(pointer, api);
  });
  canvas.on('mouse:move', ({ pointer }) => {
    if (!mouseDown) return;
    onMove(pointer);
  });

  init(api);
}

export default createCanvas;
