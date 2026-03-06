import createCanvas, { CanvasAPI } from './canvas';
import { Point, getDistance, getAngle, getAngularDelta } from './math.utils';

// Number of checkpoints evenly spaced around the circle (every 45°)
const NUM_CHECKPOINTS = 8;
const CHECKPOINT_ANGLE = 360 / NUM_CHECKPOINTS; // 45°
// Minimum angular coverage (in degrees) required for a valid attempt
const MIN_COVERAGE = 300;
// How many initial deltas to collect before locking in a direction
const DIRECTION_BUFFER_SIZE = 6;
// Tolerance (px) to start drawing on the reference ring
const START_TOLERANCE = 25;
// How much each pixel of average deviation reduces a sector's score
const PENALTY_PER_PIXEL = 5;
// Clamp totalSweep if user reverses past this (degrees)
const MIN_REVERSE_SWEEP = -90;
// Minimum mouse points required for a valid attempt
const MIN_POINT_COUNT = 50;
// Time bonus is applied only when the user finishes in under this many seconds
const MAX_TIME_BONUS_SECONDS = 5;
// Circle must cover at least this many degrees to qualify for the time bonus
const MIN_SWEEP_FOR_BONUS = 350;
// Base value used to compute the time bonus (bonus = TIME_BONUS_BASE / time)
const TIME_BONUS_BASE = 500;
// Offset to place the first checkpoint tick at 12 o'clock (top of circle)
const TWELVE_OCLOCK_OFFSET = -90;
// Visual radii (px)
const CHECKPOINT_MARKER_RADIUS = 4;
const CHECKPOINT_MARKER_HIGHLIGHTED_RADIUS = 7;
const START_MARKER_RADIUS = 8;
const CENTER_DOT_RADIUS = 8;

interface GameOptions {
  canvasEl: string;
  onGameOver: (result: GameResult) => void;
  highscore: string | null;
}

interface GameResult {
  total: number;
  avg: number;
  isHighcore: boolean;
}

function createGame({ canvasEl, onGameOver, highscore: initialHighscore }: GameOptions): void {
  let numericHighscore = initialHighscore ? parseInt(initialHighscore, 10) : 0;

  // Canvas objects created in createInitialScene
  let centerPosition: Point = { x: 0, y: 0 };
  let referenceRadius = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let referenceRing: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let checkpointMarkers: any[] = [];
  let currentApi: CanvasAPI | null = null;

  // ---------- per-round state ----------
  let isActive = false;
  let referenceDistance = 0;
  let lastAngle = 0;
  /** Cumulative angular progress in the chosen direction (0 → 360 = full circle). */
  let totalSweep = 0;
  /** +1 if CW, -1 if CCW, 0 before determined */
  let direction: 1 | -1 | 0 = 0;
  let initialDeltas: number[] = [];
  let startTime = 0;
  let pointCount = 0;
  /** Per-sector accumulated deviation and point count */
  let sectorDeviations: number[] = [];
  let sectorCounts: number[] = [];
  /** True once a full 360° sweep has been achieved */
  let gameCompleted = false;
  let finalScore = 0;

  function resetRoundState(): void {
    isActive = false;
    referenceDistance = 0;
    lastAngle = 0;
    totalSweep = 0;
    direction = 0;
    initialDeltas = [];
    startTime = 0;
    pointCount = 0;
    gameCompleted = false;
    finalScore = 0;
    sectorDeviations = new Array(NUM_CHECKPOINTS).fill(0);
    sectorCounts = new Array(NUM_CHECKPOINTS).fill(0);
  }

  // ---- scoring ----
  function computeScore(): number {
    const maxPerSector = 10000 / NUM_CHECKPOINTS;
    const penaltyPerPixel = PENALTY_PER_PIXEL;

    let totalScore = 0;
    for (let i = 0; i < NUM_CHECKPOINTS; i++) {
      if (sectorCounts[i] === 0) continue;
      const avgDeviation = sectorDeviations[i] / sectorCounts[i];
      totalScore += Math.max(0, maxPerSector - avgDeviation * penaltyPerPixel);
    }
    return Math.round(totalScore);
  }

  // ---- visual helpers ----
  function addCheckpointMarkers(api: CanvasAPI): void {
    checkpointMarkers.forEach((m) => api.canvas.remove(m));
    checkpointMarkers = [];
    for (let i = 0; i < NUM_CHECKPOINTS; i++) {
      const angleDeg = (360 / NUM_CHECKPOINTS) * i + TWELVE_OCLOCK_OFFSET;
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = centerPosition.x + referenceRadius * Math.cos(angleRad);
      const y = centerPosition.y + referenceRadius * Math.sin(angleRad);
      const marker = api.drawCircle({
        x,
        y,
        fill: '#50514F',
        strokeWidth: 0,
        radius: CHECKPOINT_MARKER_RADIUS,
      });
      checkpointMarkers.push(marker);
    }
  }

  function highlightSector(sectorIndex: number, api: CanvasAPI): void {
    const marker = checkpointMarkers[sectorIndex];
    if (!marker) return;
    (marker as any).animate('radius', CHECKPOINT_MARKER_HIGHLIGHTED_RADIUS, {
      duration: 150,
      onChange: api.canvas.renderAll.bind(api.canvas),
    });
    (marker as any).set('fill', '#70C1B3');
    api.canvas.renderAll();
  }

  // ---- event handlers ----
  function onStartDrawing(point: Point, api: CanvasAPI): void {
    const dist = getDistance(point, centerPosition);

    // Must start somewhere on (or very near) the reference ring
    if (dist < referenceRadius - START_TOLERANCE || dist > referenceRadius + START_TOLERANCE) {
      // Pulse the ring briefly to hint the correct start zone
      (referenceRing as any).animate('strokeWidth', 6, {
        duration: 150,
        onChange: api.canvas.renderAll.bind(api.canvas),
        onComplete: () => {
          (referenceRing as any).animate('strokeWidth', 2, {
            duration: 150,
            onChange: api.canvas.renderAll.bind(api.canvas),
          });
        },
      });
      return;
    }

    resetRoundState();
    isActive = true;
    referenceDistance = dist;
    lastAngle = getAngle(point, centerPosition);
    startTime = Date.now();

    // Show a small yellow marker at the start position
    api.drawCircle({
      x: point.x,
      y: point.y,
      fill: '#FFE066',
      stroke: '#50514F',
      strokeWidth: 2,
      radius: START_MARKER_RADIUS,
    });

    // Shrink reference ring so it doesn't distract
    (referenceRing as any).animate('radius', 0, {
      duration: 200,
      onChange: api.canvas.renderAll.bind(api.canvas),
    });
  }

  function onMove(point: Point): void {
    if (!isActive || gameCompleted) return;

    const currentAngle = getAngle(point, centerPosition);
    const delta = getAngularDelta(lastAngle, currentAngle);
    lastAngle = currentAngle;

    // Skip negligible movements
    if (Math.abs(delta) < 0.1) return;

    pointCount++;

    // ── Phase 1: accumulate initial deltas to lock in direction ──
    if (direction === 0) {
      if (Math.abs(delta) > 0.5) {
        initialDeltas.push(delta);
      }
      if (initialDeltas.length >= DIRECTION_BUFFER_SIZE) {
        const sum = initialDeltas.reduce((a, b) => a + b, 0);
        direction = sum >= 0 ? 1 : -1;
        // Seed totalSweep with the buffered progress
        totalSweep = initialDeltas.reduce((acc, d) => acc + d * direction, 0);
        initialDeltas = [];
      }
      return; // Don't score until direction is locked
    }

    // ── Phase 2: accumulate sweep ──
    const directedDelta = delta * direction;
    totalSweep += directedDelta;

    // Clamp totalSweep: don't let it go too negative (user clearly lost track)
    if (totalSweep < MIN_REVERSE_SWEEP) {
      totalSweep = MIN_REVERSE_SWEEP;
    }

    // ── Record deviation per sector ──
    if (totalSweep > 0 && totalSweep <= 360) {
      const sectorIdx = Math.min(
        Math.floor(totalSweep / CHECKPOINT_ANGLE),
        NUM_CHECKPOINTS - 1,
      );
      const dist = getDistance(point, centerPosition);
      const deviation = Math.abs(dist - referenceDistance);
      sectorDeviations[sectorIdx] += deviation;
      sectorCounts[sectorIdx]++;

      // Highlight the sector marker when it is first entered
      if (sectorCounts[sectorIdx] === 1 && currentApi) {
        highlightSector(sectorIdx, currentApi);
      }
    }

    // ── Circle complete? ──
    if (totalSweep >= 360 && !gameCompleted) {
      gameCompleted = true;
      isActive = false;
      finalScore = computeScore();
    }
  }

  function onEnd(_point: Point, api: CanvasAPI): void {
    // isActive may already be false if circle was auto-completed
    isActive = false;

    // Restore the reference ring
    const targetRadius = referenceDistance || referenceRadius;
    (referenceRing as any).animate('radius', targetRadius, {
      duration: 400,
      onChange: api.canvas.renderAll.bind(api.canvas),
      onComplete: () => {
        (referenceRing as any).stroke = '#70C1B3';
        (referenceRing as any).animate('strokeWidth', 10, {
          duration: 200,
          onChange: api.canvas.renderAll.bind(api.canvas),
        });
      },
    });

    // Reject attempts with too little coverage or too few points
    if (totalSweep < MIN_COVERAGE || pointCount < MIN_POINT_COUNT) {
      api.reset();
      return;
    }

    const time = (Date.now() - startTime) / 1000;
    let total = gameCompleted ? finalScore : computeScore();

    // Time bonus for fast, complete circles
    if (time > 0 && time < MAX_TIME_BONUS_SECONDS && totalSweep >= MIN_SWEEP_FOR_BONUS) {
      total += Math.round(TIME_BONUS_BASE / time);
    }

    total = Math.max(1, total);

    const isHighcore = total > numericHighscore;
    if (isHighcore) {
      numericHighscore = total;
    }

    onGameOver({
      total,
      avg: sectorCounts.reduce((a, b) => a + b, 0) > 0
        ? sectorDeviations.reduce((a, b) => a + b, 0) /
          sectorCounts.reduce((a, b) => a + b, 0)
        : 0,
      isHighcore,
    });
  }

  function createInitialScene(api: CanvasAPI): void {
    currentApi = api;
    centerPosition = api.getCenter();
    api.canvas.clear();

    // Center dot
    api.drawCircle({
      ...centerPosition,
      fill: '#50514F',
      strokeWidth: 0,
      radius: CENTER_DOT_RADIUS,
    });

    referenceRadius = Math.min(centerPosition.x, centerPosition.y) / 2;

    // Reference ring — slightly more visible to hint "draw here"
    referenceRing = api.drawCircle({
      ...centerPosition,
      stroke: '#50514F',
      strokeWidth: 2,
      radius: referenceRadius,
    });

    // Tick marks at each checkpoint angle so users see the 8 targets
    addCheckpointMarkers(api);

    // Reset round state
    resetRoundState();
  }

  createCanvas(canvasEl, {
    onMove,
    onStartDrawing,
    onEnd,
    init: createInitialScene,
  });
}

export default createGame;
