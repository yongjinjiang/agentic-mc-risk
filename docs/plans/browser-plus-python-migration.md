# Browser + Python Prototype Migration Plan

> **For Hermes:** Use this plan task-by-task. Keep the existing Python prototype intact while adding a browser-first TypeScript experience that can be hosted on GitHub Pages.

**Goal:** Let readers either run the existing Python prototype locally or open a browser-based version on GitHub Pages and interact with the same risk concepts.

**Architecture:**
Keep the current Python CLI prototype in place as the reference implementation. Add a new browser app in TypeScript that re-implements the core Monte Carlo simulation and risk metrics as pure functions with no DOM dependencies. The web app becomes the GitHub Pages entry point, while the Python code remains available for local experimentation and comparison.

**Tech Stack:**
Python 3.11+, NumPy, pytest/unittest for the current prototype; TypeScript, Vite, simple charts (optional), GitHub Pages for the browser app.

---

## Proposed repository layout

```text
agentic-mc-risk/
├── README.md
├── run_demo.py                  # Python prototype entry point
├── requirements.txt
├── src/                         # Python prototype modules
│   ├── agent.py
│   ├── audit.py
│   ├── data.py
│   ├── risk.py
│   ├── sim.py
│   └── tools.py
├── tests/                       # Python smoke tests
│   └── test_smoke.py
├── web/                         # Browser-first TypeScript app
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.ts
│       ├── core/
│       │   ├── rng.ts
│       │   ├── models.ts
│       │   ├── simulation.ts
│       │   └── risk.ts
│       └── ui/
│           ├── controls.ts
│           └── charts.ts
├── docs/
│   ├── plans/
│   │   └── browser-plus-python-migration.md
│   └── architecture.md
└── .github/
    └── workflows/
        └── ci.yml               # existing Python CI; later add web CI/pages deploy
```

---

## Task 1: Lock the public story in the README

**Objective:** Make it immediately clear that the repo supports two paths: local Python and browser-based interaction.

**Files:**
- Modify: `README.md`

**Steps:**
1. Add a short section near the top: “Two ways to use this repo”.
2. State clearly that the Python prototype stays in the repo.
3. State clearly that the browser version will live under `web/` and deploy to GitHub Pages.
4. Add two quick-start snippets: one for `python run_demo.py --yes`, one for the browser app once it exists.

**Verification:**
- README should show both entry points without implying one replaces the other.
- A new reader should understand local Python vs browser experience in under 30 seconds.

---

## Task 2: Create the browser app scaffold

**Objective:** Add a minimal TypeScript/Vite app without touching the Python prototype.

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/vite.config.ts`
- Create: `web/index.html`
- Create: `web/src/main.ts`
- Create: `web/src/style.css` (optional but recommended)

**Steps:**
1. Initialize a Vite app in `web/`.
2. Create a single page with title, short description, and a “Run simulation” button.
3. Render placeholders for model choice, horizon, confidence, and seed.

**Verification:**
- `npm install` inside `web/` succeeds.
- `npm run dev` shows a page in the browser.
- Python files are unchanged.

---

## Task 3: Port the core Monte Carlo logic to TypeScript

**Objective:** Re-implement the simulation and risk math as pure browser-safe functions.

**Files:**
- Create: `web/src/core/rng.ts`
- Create: `web/src/core/models.ts`
- Create: `web/src/core/simulation.ts`
- Create: `web/src/core/risk.ts`

**Steps:**
1. Implement a deterministic seeded RNG for reproducibility.
2. Implement GBM, OU / mean reversion, and jump diffusion in TS.
3. Implement terminal P&L, VaR, CVaR / ES, and a simple summary object.
4. Keep the API small and pure so the UI can call it directly.

**Verification:**
- Simulation returns stable results for the same seed.
- Output object includes the same headline fields as the Python prototype.
- Run a small console-based sanity check in the browser app.

---

## Task 4: Build the interactive browser UI

**Objective:** Let users change parameters and immediately see risk output in the browser.

**Files:**
- Modify: `web/src/main.ts`
- Create or modify: `web/src/ui/controls.ts`
- Create or modify: `web/src/ui/charts.ts`

**Steps:**
1. Add controls for model, horizon, confidence, position, seed, and number of paths.
2. Add a “Run simulation” button.
3. Display risk summary text and simple charts or path visualizations.
4. Keep the default experience fast by using modest defaults and letting advanced users increase path count.

**Verification:**
- User can change a parameter and rerun without page reload.
- The UI visibly updates the VaR / CVaR result.
- Same seed produces the same result.

---

## Task 5: Document the relationship between Python and browser versions

**Objective:** Prevent confusion about which implementation is authoritative.

**Files:**
- Create: `docs/architecture.md`
- Modify: `README.md`

**Steps:**
1. Explain that the Python code is the prototype/reference path.
2. Explain that the browser app is the user-facing interactive path.
3. Note that both should agree on model assumptions and headline outputs where practical.
4. Mention that heavy private-data or enterprise integrations stay out of GitHub Pages.

**Verification:**
- A reader can tell which code runs locally and which code runs in-browser.
- The docs explain why the repo keeps both implementations.

---

## Task 6: Add CI for the browser app and prepare GitHub Pages deployment

**Objective:** Make the browser app buildable in CI and ready for Pages.

**Files:**
- Modify or create: `.github/workflows/ci.yml`
- Create: `.github/workflows/pages.yml` (later, when ready)

**Steps:**
1. Add a web build job in CI.
2. Build the Python tests and the web app in separate steps.
3. Add a GitHub Pages deployment workflow once the web app is stable.

**Verification:**
- CI passes for both Python and web build.
- The site can be deployed from the `web/` build output.

---

## Task 7: Preserve the Python prototype as the local playground

**Objective:** Keep the current CLI workflow available for readers who prefer Python.

**Files:**
- Modify: `README.md`
- Optional: add a short `docs/python-prototype.md`

**Steps:**
1. Keep `run_demo.py` and `src/` as the canonical local demo.
2. Mention that users can clone and run the Python version if they prefer notebooks/scripts.
3. Keep the Python smoke tests as a lightweight regression suite.

**Verification:**
- `python run_demo.py --yes` still works.
- The browser work does not break the existing prototype.

---

## Recommended execution order

1. README framing
2. Web scaffold
3. TS core simulation
4. Browser UI
5. Architecture docs
6. Web CI / Pages deployment
7. Polish and consistency checks

---

## Notes

- Keep the TS core pure: no DOM, no framework imports, no network calls.
- Keep the Python code untouched until the web version is stable.
- If the browser version needs a charting library later, add it only after the plain simulation works.
- Use the Python implementation as a correctness reference when porting logic.
