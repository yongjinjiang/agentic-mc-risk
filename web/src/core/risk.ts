export type RiskSummary = {
  nPaths: number;
  confidence: number;
  expectedPnl: number;
  mcStandardError: number;
  var: number;
  cvar: number;
  worstCase: number;
  bestCase: number;
  median: number;
  p05: number;
  p95: number;
};

export function terminalPnl(terminalPrices: number[], initialPrice: number, position: number): number[] {
  return terminalPrices.map((price) => position * (price - initialPrice));
}

function quantile(sortedValues: number[], q: number): number {
  if (sortedValues.length === 0) {
    return NaN;
  }
  if (q <= 0) return sortedValues[0];
  if (q >= 1) return sortedValues[sortedValues.length - 1];

  const index = (sortedValues.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return sortedValues[lower];
  }
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

export function summarizeRisk(
  terminalPrices: number[],
  initialPrice: number,
  position: number,
  confidence: number,
): RiskSummary {
  const pnl = terminalPnl(terminalPrices, initialPrice, position);
  const sorted = [...pnl].sort((a, b) => a - b);
  const n = pnl.length;
  const mean = pnl.reduce((acc, value) => acc + value, 0) / n;
  const variance = pnl.reduce((acc, value) => acc + (value - mean) ** 2, 0) / Math.max(n - 1, 1);
  const se = Math.sqrt(variance / n);
  const tailCutoff = quantile(sorted, 1 - confidence);
  const tail = sorted.filter((value) => value <= tailCutoff);
  const cvar = tail.length > 0 ? tail.reduce((acc, value) => acc + value, 0) / tail.length : tailCutoff;

  return {
    nPaths: n,
    confidence,
    expectedPnl: mean,
    mcStandardError: se,
    var: -tailCutoff,
    cvar: -cvar,
    worstCase: Math.min(...pnl),
    bestCase: Math.max(...pnl),
    median: quantile(sorted, 0.5),
    p05: quantile(sorted, 0.05),
    p95: quantile(sorted, 0.95),
  };
}
