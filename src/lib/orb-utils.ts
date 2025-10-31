/**
 * Utility functions for orb pattern generation
 * Shared mathematical operations and coordinate transformations
 */

/**
 * Cubic easing function for smooth transitions
 * Ease in and out with cubic curve
 * 
 * @param t - Progress value (0 to 1)
 * @returns Eased progress value (0 to 1)
 */
export function easeInOutCubic(t: number): number {
  if (t < 0.5) {
    return 4 * t * t * t
  }
  return 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Convert polar coordinates to cartesian
 * 
 * @param angle - Angle in radians
 * @param radius - Distance from center
 * @returns [x, y] coordinates
 */
export function polarToCartesian(angle: number, radius: number): [number, number] {
  return [radius * Math.cos(angle), radius * Math.sin(angle)]
}

/**
 * Calculate Euclidean distance between two points
 * 
 * @param dx - X distance
 * @param dy - Y distance
 * @returns Distance value
 */
export function distance(dx: number, dy: number): number {
  return Math.hypot(dx, dy)
}

/**
 * Clamp value between min and max
 * 
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Map a value from one range to another
 * 
 * @param value - Input value
 * @param inMin - Input range minimum
 * @param inMax - Input range maximum
 * @param outMin - Output range minimum
 * @param outMax - Output range maximum
 * @returns Mapped value
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}

/**
 * Normalize an angle to [0, 2π) range
 * 
 * @param angle - Angle in radians
 * @returns Normalized angle
 */
export function normalizeAngle(angle: number): number {
  return ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
}

/**
 * Linear interpolation between two values
 * 
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0 to 1)
 * @returns Interpolated value
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

