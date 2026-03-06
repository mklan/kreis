import { fabric } from 'fabric';
import { Point } from './math.utils';

export interface DrawCircleOptions {
  x: number;
  y: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
}

export interface CanvasAPI {
  getCenter: () => Point;
  drawCircle: (opts: DrawCircleOptions) => fabric.Circle;
  /** Draw a filled pie-slice sector from the centre out to radius r. */
  drawSector: (
    cx: number,
    cy: number,
    r: number,
    fromDeg: number,
    toDeg: number,
    cw: boolean,
    fill: string,
  ) => fabric.Object;
  /** Remove a previously added canvas object. */
  removeObject: (obj: fabric.Object) => void;
  reset: () => void;
  canvas: fabric.Canvas;
}

interface CanvasOptions {
  onStartDrawing?: (point: Point, api: CanvasAPI) => void;
  onMove?: (point: Point) => void;
  onEnd?: (point: Point, api: CanvasAPI) => void;
  init?: (api: CanvasAPI) => void;
}

function createCanvas(canvasEl: string, options: CanvasOptions = {}): void {
  const {
    onStartDrawing = () => {},
    onMove = () => {},
    onEnd = () => {},
    init = () => {},
  } = options;

  let mouseDown = false;

  (fabric.Object.prototype as any).selectable = false;
  (fabric.Object.prototype as any).transparentCorners = false;

  const canvas = new fabric.Canvas(canvasEl, {
    isDrawingMode: true,
  });

  (canvas.freeDrawingBrush as any).color = '#F25F5C';
  (canvas.freeDrawingBrush as any).width = 10;

  let containerSize = {
    width: document.getElementById('canvas-container')!.offsetWidth,
    height: document.getElementById('canvas-container')!.offsetHeight,
  };

  function fitResponsiveCanvas(): void {
    containerSize = {
      width: document.getElementById('canvas-container')!.offsetWidth,
      height: document.getElementById('canvas-container')!.offsetHeight,
    };
    canvas.setWidth(containerSize.width);
    canvas.setHeight(containerSize.height);
    canvas.setZoom(1);
  }

  fitResponsiveCanvas();
  window.onresize = fitResponsiveCanvas;

  function getCenter(): Point {
    return { x: containerSize.width / 2, y: containerSize.height / 2 };
  }

  function drawCircle({
    x,
    y,
    fill,
    stroke,
    strokeWidth,
    radius,
  }: DrawCircleOptions): fabric.Circle {
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
    } as any);

    canvas.add(circle);
    canvas.sendToBack(circle);
    return circle;
  }

  function drawSector(
    cx: number,
    cy: number,
    r: number,
    fromDeg: number,
    toDeg: number,
    cw: boolean,
    fill: string,
  ): fabric.Object {
    const fromRad = (fromDeg * Math.PI) / 180;
    const toRad = (toDeg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(fromRad);
    const y1 = cy + r * Math.sin(fromRad);
    const x2 = cx + r * Math.cos(toRad);
    const y2 = cy + r * Math.sin(toRad);
    // sweep-flag: 1 = clockwise, 0 = counter-clockwise
    const sweepFlag = cw ? 1 : 0;
    // Each sector is 45° (< 180°) so large-arc-flag is always 0
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 ${sweepFlag} ${x2} ${y2} Z`;
    const path = new fabric.Path(d, {
      fill,
      stroke: null,
      strokeWidth: 0,
      selectable: false,
      evented: false,
    } as any);
    canvas.add(path);
    canvas.sendToBack(path);
    canvas.renderAll();
    return path as unknown as fabric.Object;
  }

  function removeObject(obj: fabric.Object): void {
    canvas.remove(obj);
    canvas.renderAll();
  }

  const api: CanvasAPI = {
    getCenter,
    drawCircle,
    drawSector,
    removeObject,
    reset,
    canvas,
  };

  function reset(): void {
    canvas.clear();
    init(api);
  }

  canvas.on('mouse:down', (e: any) => {
    reset();
    onStartDrawing(e.pointer, api);
    mouseDown = true;
  });
  canvas.on('mouse:up', (e: any) => {
    mouseDown = false;
    onEnd(e.pointer, api);
  });
  canvas.on('mouse:move', (e: any) => {
    if (!mouseDown) return;
    onMove(e.pointer);
  });

  init(api);
}

export default createCanvas;
