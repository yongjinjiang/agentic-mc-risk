export type ModelType = 'gbm' | 'ou' | 'jump-diffusion';

export type SimulationConfig = {
  model: ModelType;
  horizon: number;
  confidence: number;
  paths: number;
  seed: number;
  position: number;
};

export type ModelParams = {
  s0: number;
  mu: number;
  sigma: number;
  theta: number;
  meanLevel: number;
  jumpIntensity: number;
  jumpMean: number;
  jumpStd: number;
  dt: number;
};

export const DEFAULT_CONFIG: SimulationConfig = {
  model: 'ou',
  horizon: 21,
  confidence: 0.95,
  paths: 10000,
  seed: 42,
  position: 1000,
};

export const DEFAULT_PARAMS: ModelParams = {
  s0: 45,
  mu: 0.02,
  sigma: 0.25,
  theta: 0.18,
  meanLevel: 45,
  jumpIntensity: 12,
  jumpMean: 0.03,
  jumpStd: 0.12,
  dt: 1 / 252,
};
