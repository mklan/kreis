export interface Point {
  x: number;
  y: number;
}

export const getDistance = (a: Point, b: Point): number =>
  Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

/** Returns the angle in degrees from center to point (atan2). */
export const getAngle = (point: Point, center: Point): number =>
  Math.atan2(point.y - center.y, point.x - center.x) * (180 / Math.PI);

/**
 * Returns the shortest angular delta from `from` to `to` in [-180, 180].
 * Positive = clockwise in screen coords (y-axis down).
 */
export const getAngularDelta = (from: number, to: number): number => {
  let delta = to - from;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
};
