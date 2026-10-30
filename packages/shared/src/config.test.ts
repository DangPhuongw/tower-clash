import { describe, it, expect } from 'vitest';
import { PHYS_CONFIG, CRANE_CONFIG, SCORE_CONFIG } from './config/constants.js';

describe('Shared Config Constants', () => {
  it('should have standard physical constants', () => {
    expect(PHYS_CONFIG.gravity).toBe(-20);
    expect(PHYS_CONFIG.blockW).toBe(2.0);
    expect(PHYS_CONFIG.blockH).toBe(0.8);
    expect(PHYS_CONFIG.pxPerUnit).toBe(50);
  });

  it('should have standard crane constants', () => {
    expect(CRANE_CONFIG.amplitude).toBe(3.0);
    expect(CRANE_CONFIG.period).toBe(2.0);
    expect(CRANE_CONFIG.speedupFactor).toBe(0.95);
  });

  it('should have standard score constants', () => {
    expect(SCORE_CONFIG.perFloor).toBe(10);
    expect(SCORE_CONFIG.perfectBonus).toBe(5);
    expect(SCORE_CONFIG.comboStart).toBe(3);
    expect(SCORE_CONFIG.comboMul).toBe(1.5);
  });
});
