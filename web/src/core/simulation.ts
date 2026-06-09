import { createSeededRng, nextStandardNormal } from './rng';
import { DEFAULT_PARAMS, ModelParams, ModelType } from './models';

export type SimulationResult = {
  model: ModelType;
  paths: number;
  horizon: number;
  seed: number;
  samplePath: number[];
  terminalPrices: number[];
};

function poissonSample(lambda: number, rng = createSeededRng(1)): number {
  if (lambda <= 0) return 0;
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= rng.next();
  } while (p > limit);
  return k - 1;
}

function gbmStep(s: number, mu: number, sigma: number, dt: number, z: number): number {
  return s * Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z);
}

function ouStep(s: number, theta: number, meanLevel: number, sigma: number, dt: number, z: number): number {
  const next = s + theta * (meanLevel - s) * dt + sigma * Math.sqrt(dt) * z;
  return Math.max(0.01, next);
}

function jumpDiffusionStep(
  s: number,
  mu: number,
  sigma: number,
  dt: number,
  jumpIntensity: number,
  jumpMean: number,
  jumpStd: number,
  z: number,
  rng: ReturnType<typeof createSeededRng>,
): number {
  const nJumps = poissonSample(jumpIntensity * dt, rng);
  let jumpComponent = 0;
  if (nJumps > 0) {
    const zJump = nextStandardNormal(rng);
    jumpComponent = nJumps * jumpMean + Math.sqrt(nJumps) * jumpStd * zJump;
  }
  const logReturn = (mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z + jumpComponent;
  return s * Math.exp(logReturn);
}

export function simulatePaths(
  model: ModelType,
  config: {
    horizon: number;
    paths: number;
    seed: number;
  },
  params: Partial<ModelParams> = {},
): SimulationResult {
  const merged: ModelParams = { ...DEFAULT_PARAMS, ...params };
  const rng = createSeededRng(config.seed);
  const samplePath = new Array<number>(config.horizon + 1);
  const terminalPrices = new Array<number>(config.paths);

  samplePath[0] = merged.s0;

  for (let p = 0; p < config.paths; p += 1) {
    let price = merged.s0;
    if (p === 0) samplePath[0] = price;

    for (let t = 1; t <= config.horizon; t += 1) {
      const z = nextStandardNormal(rng);
      if (model === 'gbm') {
        price = gbmStep(price, merged.mu, merged.sigma, merged.dt, z);
      } else if (model === 'ou') {
        price = ouStep(price, merged.theta, merged.meanLevel, merged.sigma, merged.dt, z);
      } else {
        price = jumpDiffusionStep(
          price,
          merged.mu,
          merged.sigma,
          merged.dt,
          merged.jumpIntensity,
          merged.jumpMean,
          merged.jumpStd,
          z,
          rng,
        );
      }

      if (p === 0) samplePath[t] = price;
    }

    terminalPrices[p] = price;
  }

  return {
    model,
    paths: config.paths,
    horizon: config.horizon,
    seed: config.seed,
    samplePath,
    terminalPrices,
  };
}
