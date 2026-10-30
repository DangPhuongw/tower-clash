export const PHYS_CONFIG = {
  gravity: -20,
  blockW: 2.0,
  blockH: 0.8,
  friction: 0.8,
  restitution: 0.05,
  pxPerUnit: 50,
  baseWidth: 4.0,
} as const;

export const CRANE_CONFIG = {
  amplitude: 3.0,
  period: 2.0,
  speedupEvery: 10,
  speedupFactor: 0.95,
  minPeriod: 1.0,
  heightAboveTop: 6.0,
  dropCooldown: 0.6,
  releaseVelFactor: 0.3,
} as const;

export const SETTLE_CONFIG = {
  maxTime: 2.0,
  velEps: 0.05,
  stableTime: 0.3,
} as const;

export const COLLAPSE_CONFIG = {
  maxTiltDeg: 25,
} as const;

export const SCORE_CONFIG = {
  perFloor: 10,
  perfectBonus: 5,
  perfectTolerance: 0.05,
  comboStart: 3,
  comboMul: 1.5,
} as const;

export const RACE_CONFIG = {
  targetScore: 300,
  matchTime: 300,
  defaultWave: 3,
  waveFloorBonus: 2,
} as const;

export const SABOTAGE_CONFIG = {
  dropTimeLimit: 10,
  collapseRemoveFloors: 3,
  speedupFloor: 60,
  speedupPerRound: 0.9,
} as const;

export const COOP_CONFIG = {
  targetFloors: 25,
  matchTime: 360,
  dropTimeLimit: 10,
  collapseRemoveFloors: 3,
  collapseLock: 3,
} as const;

export const CARD_CONFIG = {
  chooseTime: 5,
  revealTime: 1.2,
} as const;

export const ITEM_CONFIG = {
  slots: 2,
  gainEveryFloors: 5,
  gainOnPerfectStreak: 3,
  sabotageGainEveryTurns: 2,
} as const;

export const NET_CONFIG = {
  simHz: 60,
  snapshotHz: 20,
  interpDelayMs: 100,
  maxLagCompMs: 150,
  reconnectS: 30,
  quickMatchWaitS: 20,
  roomCodeLength: 5,
} as const;
