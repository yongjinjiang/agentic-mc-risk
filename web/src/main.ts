import './style.css';

type Metric = {
  label: string;
  value: string;
};

const metrics: Metric[] = [
  { label: 'Model', value: 'OU mean reversion' },
  { label: 'Horizon', value: '21 trading days' },
  { label: 'Confidence', value: '95%' },
  { label: 'Paths', value: '10,000' },
];

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
        This scaffold will grow into an interactive Monte Carlo experience while
        the Python prototype stays available for local use.
      </p>
    </section>

    <section class="panel controls" aria-label="simulation controls">
      <div class="control-grid">
        <label>
          <span>Model</span>
          <select>
            <option>OU mean reversion</option>
            <option>GBM</option>
            <option>Jump diffusion</option>
          </select>
        </label>
        <label>
          <span>Horizon</span>
          <input type="range" min="1" max="252" value="21" />
        </label>
        <label>
          <span>Confidence</span>
          <input type="range" min="90" max="99" value="95" />
        </label>
        <label>
          <span>Paths</span>
          <input type="number" min="1000" step="1000" value="10000" />
        </label>
      </div>
      <button id="run-btn" type="button">Run simulation</button>
    </section>

    <section class="panel results" aria-label="simulation results">
      <h2>Risk summary</h2>
      <div class="metrics" id="metrics"></div>
      <p class="placeholder" id="status">Scaffold ready. Core simulation logic will be added next.</p>
    </section>
  </main>
`;

const metricsEl = document.querySelector<HTMLDivElement>('#metrics');
if (metricsEl) {
  metricsEl.innerHTML = metrics
    .map((metric) => `<div class="metric"><span>${metric.label}</span><strong>${metric.value}</strong></div>`)
    .join('');
}

const statusEl = document.querySelector<HTMLParagraphElement>('#status');
const runBtn = document.querySelector<HTMLButtonElement>('#run-btn');

runBtn?.addEventListener('click', () => {
  if (statusEl) {
    statusEl.textContent = 'Browser scaffold works. Next step: wire in the TypeScript Monte Carlo core.';
  }
});
