import createCanvas, { CanvasAPI } from './canvas';
import { Point, getDistance, getAngle, getAngularDelta } from './math.utils';
import {
  playStartSound,
  playCheckpointSound,
  playGameOverSound,
  startBackgroundMusic,
} from './sounds';

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
// Visual radii (px)
const START_MARKER_RADIUS = 8;
const CENTER_DOT_RADIUS = 8;
// Fill colour for completed sector arcs
const SECTOR_ARC_FILL = 'rgba(112, 193, 179, 0.72)';

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
  let currentApi: CanvasAPI | null = null;

  // ---------- per-round state ----------
  let isActive = false;
  let referenceDistance = 0;
  let lastAngle = 0;
  /** Screen angle (degrees) at the exact point where the user started. */
  let startAngle = 0;
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
  /** How many sector arcs are currently drawn (equals the number of fully swept sectors). */
  let completedSectors = 0;
  /** Fabric objects for each drawn sector arc (null = not yet drawn). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sectorArcs: (any | null)[] = [];

  function resetRoundState(): void {
    isActive = false;
    referenceDistance = 0;
    lastAngle = 0;
    startAngle = 0;
    totalSweep = 0;
    direction = 0;
    initialDeltas = [];
    startTime = 0;
    pointCount = 0;
    gameCompleted = false;
    finalScore = 0;
    sectorDeviations = new Array(NUM_CHECKPOINTS).fill(0);
    sectorCounts = new Array(NUM_CHECKPOINTS).fill(0);
    // canvas.clear() has already been called by reset(); just null the refs
    completedSectors = 0;
    sectorArcs = new Array(NUM_CHECKPOINTS).fill(null);
  }

  // ---- scoring ----
  function computeScore(): number {
    const maxPerSector = 10000 / NUM_CHECKPOINTS;

    let totalScore = 0;
    for (let i = 0; i < NUM_CHECKPOINTS; i++) {
      if (sectorCounts[i] === 0) continue;
      const avgDeviation = sectorDeviations[i] / sectorCounts[i];
      totalScore += Math.max(0, maxPerSector - avgDeviation * PENALTY_PER_PIXEL);
    }
    return Math.round(totalScore);
  }

  // ---- arc helpers ----
  /**
   * Draw a pie-slice arc for the given sector index, based on the user's
   * start angle and chosen direction. Returns the fabric object.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function drawSectorArc(sectorIdx: number): any {
    if (!currentApi || direction === 0) return null;

    const cx = centerPosition.x;
    const cy = centerPosition.y;
    const r = referenceDistance || referenceRadius;

    let fromDeg: number;
    let toDeg: number;

    if (direction === 1) {
      // Clockwise: sector i spans [startAngle + i×45°, startAngle + (i+1)×45°]
      fromDeg = startAngle + sectorIdx * CHECKPOINT_ANGLE;
      toDeg = startAngle + (sectorIdx + 1) * CHECKPOINT_ANGLE;
    } else {
      // Counter-clockwise: sector i spans back from startAngle
      fromDeg = startAngle - sectorIdx * CHECKPOINT_ANGLE;
      toDeg = startAngle - (sectorIdx + 1) * CHECKPOINT_ANGLE;
    }

    return currentApi.drawSector(cx, cy, r, fromDeg, toDeg, direction === 1, SECTOR_ARC_FILL);
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

    // Start background music on first user interaction (browser autoplay policy)
    startBackgroundMusic();
    playStartSound();

    resetRoundState();
    isActive = true;
    referenceDistance = dist;
    lastAngle = getAngle(point, centerPosition);
    startAngle = lastAngle;
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
    }

    // ── Update sector arc visuals ──
    const newCompletedCount = Math.min(
      Math.floor(Math.max(0, totalSweep) / CHECKPOINT_ANGLE),
      NUM_CHECKPOINTS,
    );

    // Add arcs for newly completed sectors
    while (completedSectors < newCompletedCount && completedSectors < NUM_CHECKPOINTS) {
      const arc = drawSectorArc(completedSectors);
      sectorArcs[completedSectors] = arc;
      playCheckpointSound(completedSectors);
      completedSectors++;
    }

    // Remove arcs when the user reverses past a sector boundary
    while (completedSectors > newCompletedCount && completedSectors > 0) {
      completedSectors--;
      if (sectorArcs[completedSectors] && currentApi) {
        currentApi.removeObject(sectorArcs[completedSectors]);
        sectorArcs[completedSectors] = null;
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

    playGameOverSound();

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

