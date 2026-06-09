import './style.css';
import { DEFAULT_CONFIG, DEFAULT_PARAMS, ModelType } from './core/models';
import { simulatePaths } from './core/simulation';
import { summarizeRisk } from './core/risk';

type Metric = {
  label: string;
  value: string;
};

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root not found');
}

app.innerHTML = `
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">GitHub Pages demo</p>
      <h1>Agentic Monte Carlo Risk Workflow</h1>
      <p class="lede">
        Explore a browser-friendly version of the risk simulation prototype.
        Adjust the controls, run the simulation, and inspect how model choice,
        horizon, confidence, and jump behavior affect the risk output.
      </p>
    </section>

    <section class="panel controls" aria-label="simulation controls">
      <div class="control-grid">
        <label>
          <span>Model</span>
          <select id="model-select">
            <option value="ou">OU mean reversion</option>
            <option value="gbm">GBM</option>
            <option value="jump-diffusion">Jump diffusion</option>
          </select>
        </label>
        <label>
          <span>Horizon: <strong id="horizon-value">${DEFAULT_CONFIG.horizon}</strong> days</span>
          <input id="horizon-input" type="range" min="1" max="252" value="${DEFAULT_CONFIG.horizon}" />
        </label>
        <label>
          <span>Confidence: <strong id="confidence-value">${Math.round(DEFAULT_CONFIG.confidence * 100)}%</strong></span>
          <input id="confidence-input" type="range" min="90" max="99" value="${Math.round(DEFAULT_CONFIG.confidence * 100)}" />
        </label>
        <label>
          <span>Paths</span>
          <input id="paths-input" type="number" min="1000" step="1000" value="${DEFAULT_CONFIG.paths}" />
        </label>
        <label>
          <span>Seed</span>
          <input id="seed-input" type="number" min="0" step="1" value="${DEFAULT_CONFIG.seed}" />
        </label>
        <label>
          <span>Position</span>
          <input id="position-input" type="number" min="1" step="100" value="${DEFAULT_CONFIG.position}" />
        </label>
      </div>
      <button id="run-btn" type="button">Run simulation</button>
    </section>

    <section class="panel results" aria-label="simulation results">
      <h2>Risk summary</h2>
      <div class="metrics" id="metrics"></div>
      <div class="viz-grid">
        <div class="viz-card">
          <h3>Sample path</h3>
          <div id="path-chart"></div>
        </div>
        <div class="viz-card">
          <h3>P&L histogram</h3>
          <div id="histogram-chart"></div>
        </div>
      </div>
      <p class="placeholder" id="status">Ready to simulate. Click the button to generate paths.</p>
    </section>
  </main>
`;

const horizonInput = document.querySelector<HTMLInputElement>('#horizon-input');
const horizonValue = document.querySelector<HTMLElement>('#horizon-value');
const confidenceInput = document.querySelector<HTMLInputElement>('#confidence-input');
const confidenceValue = document.querySelector<HTMLElement>('#confidence-value');
const modelSelect = document.querySelector<HTMLSelectElement>('#model-select');
const pathsInput = document.querySelector<HTMLInputElement>('#paths-input');
const seedInput = document.querySelector<HTMLInputElement>('#seed-input');
const positionInput = document.querySelector<HTMLInputElement>('#position-input');
const runBtn = document.querySelector<HTMLButtonElement>('#run-btn');
const metricsEl = document.querySelector<HTMLDivElement>('#metrics');
const statusEl = document.querySelector<HTMLParagraphElement>('#status');
const pathChartEl = document.querySelector<HTMLDivElement>('#path-chart');
const histogramChartEl = document.querySelector<HTMLDivElement>('#histogram-chart');

const formatMoney = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value);

function renderMetrics(metrics: Metric[]): void {
  if (!metricsEl) return;
  metricsEl.innerHTML = metrics
    .map((metric) => `<div class="metric"><span>${metric.label}</span><strong>${metric.value}</strong></div>`)
    .join('');
}

function renderSparkline(values: number[]): void {
  if (!pathChartEl || values.length === 0) return;

  const width = 620;
  const height = 220;
  const padding = 18;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = (width - 2 * padding) / Math.max(values.length - 1, 1);

  const points = values
    .map((value, index) => {
      const x = padding + index * stepX;
      const y = height - padding - ((value - min) / span) * (height - 2 * padding);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  pathChartEl.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="sample path chart">
      <rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="#f8fbff" />
      <polyline fill="none" stroke="#1f5eff" stroke-width="3" points="${points}" />
      <text x="18" y="24" fill="#637996" font-size="12">start ${formatMoney(values[0])}</text>
      <text x="18" y="42" fill="#637996" font-size="12">end ${formatMoney(values[values.length - 1])}</text>
    </svg>
  `;
}

function renderHistogram(values: number[]): void {
  if (!histogramChartEl || values.length === 0) return;

  const width = 620;
  const height = 220;
  const bins = 18;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const counts = new Array<number>(bins).fill(0);

  for (const value of values) {
    const idx = Math.min(bins - 1, Math.floor(((value - min) / span) * bins));
    counts[idx] += 1;
  }

  const barWidth = width / bins;
  const maxCount = Math.max(...counts) || 1;

  histogramChartEl.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="P&L histogram">
      <rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="#f8fbff" />
      ${counts
        .map((count, index) => {
          const barHeight = ((count / maxCount) * (height - 40));
          const x = index * barWidth + 6;
          const y = height - barHeight - 20;
          return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(barWidth - 10).toFixed(1)}" height="${barHeight.toFixed(1)}" rx="6" fill="#5f8cff" opacity="0.85" />`;
        })
        .join('')}
      <text x="18" y="24" fill="#637996" font-size="12">min ${formatMoney(min)}</text>
      <text x="18" y="42" fill="#637996" font-size="12">max ${formatMoney(max)}</text>
    </svg>
  `;
}

function currentConfig() {
  return {
    model: (modelSelect?.value ?? 'ou') as ModelType,
    horizon: Number(horizonInput?.value ?? DEFAULT_CONFIG.horizon),
    confidence: Number(confidenceInput?.value ?? Math.round(DEFAULT_CONFIG.confidence * 100)) / 100,
    paths: Number(pathsInput?.value ?? DEFAULT_CONFIG.paths),
    seed: Number(seedInput?.value ?? DEFAULT_CONFIG.seed),
    position: Number(positionInput?.value ?? DEFAULT_CONFIG.position),
  };
}

function runSimulation(): void {
  const config = currentConfig();
  const simulation = simulatePaths(
    config.model,
    { horizon: config.horizon, paths: config.paths, seed: config.seed },
    DEFAULT_PARAMS,
  );
  const summary = summarizeRisk(simulation.terminalPrices, DEFAULT_PARAMS.s0, config.position, config.confidence);
  const pnl = simulation.terminalPrices.map((price) => config.position * (price - DEFAULT_PARAMS.s0));

  renderMetrics([
    { label: 'Model', value: config.model.replace('-', ' ') },
    { label: 'Horizon', value: `${config.horizon} days` },
    { label: 'Confidence', value: `${Math.round(config.confidence * 100)}%` },
    { label: 'Paths', value: new Intl.NumberFormat('en-US').format(config.paths) },
    { label: 'Expected P&L', value: formatMoney(summary.expectedPnl) },
    { label: 'VaR', value: formatMoney(summary.var) },
    { label: 'CVaR / ES', value: formatMoney(summary.cvar) },
    { label: 'Seed', value: String(config.seed) },
  ]);

  renderSparkline(simulation.samplePath);
  renderHistogram(pnl);

  if (statusEl) {
    statusEl.textContent = `Simulated ${config.paths.toLocaleString('en-US')} paths with seed ${config.seed}. Terminal price range: ${formatMoney(Math.min(...simulation.terminalPrices))} to ${formatMoney(Math.max(...simulation.terminalPrices))}.`;
  }

  if (horizonValue) horizonValue.textContent = String(config.horizon);
  if (confidenceValue) confidenceValue.textContent = `${Math.round(config.confidence * 100)}%`;
}

horizonInput?.addEventListener('input', () => {
  if (horizonValue && horizonInput) horizonValue.textContent = horizonInput.value;
});

confidenceInput?.addEventListener('input', () => {
  if (confidenceValue && confidenceInput) confidenceValue.textContent = `${confidenceInput.value}%`;
});

runBtn?.addEventListener('click', runSimulation);
runSimulation();
