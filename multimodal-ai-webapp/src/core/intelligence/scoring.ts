export function intentConfidenceBoost(base: number, hasCompany: boolean, hasRole: boolean): number {
  let score = base
  if (hasCompany) score += 0.1
  if (hasRole) score += 0.1
  return Math.min(1, score)
}

export function clamp01(n: number) { return Math.max(0, Math.min(1, n)) }

export function combineScores(weights: number[], scores: number[]): number {
  const wsum = weights.reduce((a, b) => a + b, 0) || 1
  const s = scores.reduce((acc, s, i) => acc + (weights[i] || 0) * s, 0) / wsum
  return clamp01(s)
}


