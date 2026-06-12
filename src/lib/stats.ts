/** Statistical helpers for box/violin/histogram/density/correlation charts. */

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (base + 1 < sorted.length) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export interface BoxStats {
  low: number;
  q1: number;
  median: number;
  q3: number;
  high: number;
  outliers: number[];
}

export function boxStats(values: number[]): BoxStats {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const loFence = q1 - 1.5 * iqr;
  const hiFence = q3 + 1.5 * iqr;
  const inliers = sorted.filter((v) => v >= loFence && v <= hiFence);
  return {
    low: inliers[0] ?? q1,
    q1,
    median,
    q3,
    high: inliers[inliers.length - 1] ?? q3,
    outliers: sorted.filter((v) => v < loFence || v > hiFence),
  };
}

/** Gaussian kernel density estimate evaluated at `points` positions. */
export function kde(values: number[], points: number[], bandwidth?: number): number[] {
  const n = values.length;
  if (n === 0) return points.map(() => 0);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1)) || 1;
  // Silverman's rule of thumb
  const h = bandwidth ?? 1.06 * sd * Math.pow(n, -0.2);
  const norm = 1 / (n * h * Math.sqrt(2 * Math.PI));
  return points.map((x) => {
    let sum = 0;
    for (const v of values) {
      const u = (x - v) / h;
      sum += Math.exp(-0.5 * u * u);
    }
    return sum * norm;
  });
}

export function linspace(min: number, max: number, count: number): number[] {
  if (count <= 1) return [min];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + i * step);
}

export interface HistBin {
  x0: number;
  x1: number;
  count: number;
}

export function histogram(values: number[], binCount: number): HistBin[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = span / binCount;
  const bins: HistBin[] = Array.from({ length: binCount }, (_, i) => ({
    x0: min + i * width,
    x1: min + (i + 1) * width,
    count: 0,
  }));
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  }
  return bins;
}

export function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return NaN;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
}
