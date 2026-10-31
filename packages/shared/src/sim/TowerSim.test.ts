import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { NET_CONFIG, PHYS_CONFIG } from '../config/constants.js';
import { TowerSim, initPhysics } from './index.js';

const sims: TowerSim[] = [];
function makeSim(baseX = 0): TowerSim {
  const sim = new TowerSim({ baseX });
  sims.push(sim);
  return sim;
}

/** Tâm y của khối nằm yên trên mặt nền móng. */
const restY = PHYS_CONFIG.baseHeight + PHYS_CONFIG.blockH / 2;

beforeAll(async () => {
  await initPhysics();
});

afterEach(() => {
  while (sims.length) sims.pop()?.dispose();
});

describe('TowerSim – khởi tạo', () => {
  it('bước cố định đúng 1/simHz (60 Hz)', () => {
    expect(TowerSim.FIXED_DT).toBeCloseTo(1 / NET_CONFIG.simHz, 12);
    expect(NET_CONFIG.simHz).toBe(60);
  });

  it('create() tự khởi tạo Rapier', async () => {
    const sim = await TowerSim.create();
    sims.push(sim);
    expect(sim.blockCount).toBe(0);
  });

  it('nền móng đúng kích thước mục 3.1, đỉnh tháp rỗng = mặt nền', () => {
    const sim = makeSim(5);
    expect(sim.baseX).toBe(5);
    expect(sim.baseWidth).toBe(PHYS_CONFIG.baseWidth);
    expect(sim.baseTopY).toBe(PHYS_CONFIG.baseHeight);
    expect(sim.getTopY()).toBe(PHYS_CONFIG.baseHeight);
  });
});

describe('TowerSim – khối', () => {
  it('khối mặc định 2.0 x 0.8 và id tăng dần', () => {
    const sim = makeSim();
    const a = sim.spawnBlock({ x: 0, y: 5 });
    const b = sim.spawnBlock({ x: 0, y: 7 });
    expect(b).toBeGreaterThan(a);
    const s = sim.getBlock(a);
    expect(s?.width).toBe(PHYS_CONFIG.blockW);
    expect(s?.height).toBe(PHYS_CONFIG.blockH);
    expect(sim.toSnapshot()).toHaveLength(2);
  });

  it('rơi theo trọng lực -20 unit/s²', () => {
    const sim = makeSim();
    const id = sim.spawnBlock({ x: 0, y: 50 });
    sim.stepN(NET_CONFIG.simHz / 2); // 0.5 s, chưa chạm nền
    const s = sim.getBlock(id);
    expect(s).not.toBeNull();
    // v = g·t = -10; Rapier dùng Euler bán ẩn nên sai số nhỏ.
    expect(s!.vy).toBeCloseTo(PHYS_CONFIG.gravity * 0.5, 1);
    expect(s!.y).toBeLessThan(50 - 2.4);
    expect(s!.y).toBeGreaterThan(50 - 2.7);
  });

  it('khối thả giữa nền móng nằm yên trên nền, không chạm đất', () => {
    const sim = makeSim();
    const id = sim.spawnBlock({ x: 0, y: 4 });
    sim.stepN(NET_CONFIG.simHz * 2);
    const s = sim.getBlock(id)!;
    expect(s.y).toBeCloseTo(restY, 1);
    expect(Math.abs(s.x)).toBeLessThan(0.01);
    expect(Math.abs(s.angle)).toBeLessThan(0.01);
    expect(Math.hypot(s.vx, s.vy)).toBeLessThan(0.05);
    expect(sim.isTouchingBase(id)).toBe(true);
    expect(sim.isTouchingGround(id)).toBe(false);
    expect(sim.getTopY()).toBeCloseTo(restY + PHYS_CONFIG.blockH / 2, 1);
  });

  it('khối thả ngoài nền móng rơi xuống chạm đất', () => {
    const sim = makeSim();
    const id = sim.spawnBlock({ x: 6, y: 4 });
    sim.stepN(NET_CONFIG.simHz * 2);
    expect(sim.isTouchingGround(id)).toBe(true);
    expect(sim.isTouchingBase(id)).toBe(false);
  });

  it('xếp chồng 2 khối ổn định', () => {
    const sim = makeSim();
    const a = sim.spawnBlock({ x: 0, y: 3 });
    sim.stepN(NET_CONFIG.simHz);
    const b = sim.spawnBlock({ x: 0.1, y: 5 });
    sim.stepN(NET_CONFIG.simHz * 2);
    expect(sim.getBlock(a)!.y).toBeCloseTo(restY, 1);
    expect(sim.getBlock(b)!.y).toBeCloseTo(restY + PHYS_CONFIG.blockH, 1);
    expect(sim.isTouchingGround(a)).toBe(false);
    expect(sim.isTouchingGround(b)).toBe(false);
  });

  it('removeBlock xoá khối khỏi mô phỏng', () => {
    const sim = makeSim();
    const id = sim.spawnBlock({ x: 0, y: 3 });
    expect(sim.removeBlock(id)).toBe(true);
    expect(sim.removeBlock(id)).toBe(false);
    expect(sim.hasBlock(id)).toBe(false);
    expect(sim.blockCount).toBe(0);
  });
});

describe('TowerSim – bước cố định 60 Hz', () => {
  it('advance() tích luỹ thời gian và chạy đúng số bước', () => {
    const sim = makeSim();
    expect(sim.advance(1 / 120)).toBe(0);
    expect(sim.advance(1 / 120)).toBe(1);
    expect(sim.advance(0.05)).toBe(3);
    expect(sim.tick).toBe(4);
    expect(sim.time).toBeCloseTo(4 / 60, 12);
    expect(sim.alpha).toBeGreaterThanOrEqual(0);
    expect(sim.alpha).toBeLessThan(1);
  });

  it('1 giây thời gian thực ở bất kỳ frame-rate nào cũng là 60 tick', () => {
    for (const fps of [30, 60, 144]) {
      const sim = makeSim();
      for (let i = 0; i < fps; i++) sim.advance(1 / fps);
      expect(sim.tick).toBe(60);
    }
  });

  it('giới hạn số bước mỗi lần advance để tránh spiral of death', () => {
    const sim = makeSim();
    expect(sim.advance(10)).toBe(PHYS_CONFIG.maxStepsPerAdvance);
    expect(sim.alpha).toBe(0);
    expect(sim.advance(0)).toBe(0);
    expect(sim.advance(Number.NaN)).toBe(0);
  });

  it('tất định: cùng chuỗi input cho kết quả giống hệt bit', () => {
    const run = (): number[][] => {
      const sim = makeSim();
      for (let i = 0; i < 5; i++) {
        sim.spawnBlock({ x: (i % 2 ? 0.4 : -0.3) * i, y: 3 + i, vx: 0.2 * i });
        sim.stepN(45);
      }
      sim.stepN(120);
      return sim.toSnapshot().map((b) => [...b]);
    };
    expect(run()).toEqual(run());
  });

  it('dispose() giải phóng và chặn dùng lại', () => {
    const sim = new TowerSim();
    sim.dispose();
    sim.dispose();
    expect(() => sim.step()).toThrow();
  });
});
