import { describe, it, expect, beforeAll } from 'vitest';
import { CRANE_CONFIG, PHYS_CONFIG } from '../config/constants.js';
import { Crane } from './Crane.js';
import { TowerSim } from './TowerSim.js';
import { initPhysics } from './rapier.js';

describe('Crane (M1.3 – Cần cẩu, dao động, tăng tốc, cooldown)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  describe('1. Vị trí cần cẩu theo thời gian (x(t) = centerX + A·sin(2πt/T))', () => {
    it('dao động điều hoà chuẩn với T = 2.0s và A = 3.0 unit', () => {
      const crane = new Crane({ centerX: 0, amplitude: 3.0, basePeriod: 2.0, startTime: 0 });

      // Tại t = 0: x = 0
      expect(crane.getX(0)).toBeCloseTo(0, 5);

      // Tại t = T/4 (0.5s): đạt cực đại biên phải x = +3.0
      expect(crane.getX(0.5)).toBeCloseTo(3.0, 5);

      // Tại t = T/2 (1.0s): qua vị trí cân bằng x = 0
      expect(crane.getX(1.0)).toBeCloseTo(0, 5);

      // Tại t = 3T/4 (1.5s): đạt cực tiểu biên trái x = -3.0
      expect(crane.getX(1.5)).toBeCloseTo(-3.0, 5);

      // Tại t = T (2.0s): hết 1 chu kỳ, trở về x = 0
      expect(crane.getX(2.0)).toBeCloseTo(0, 5);

      // Tại t = 2.5s: lặp lại cực đại biên phải
      expect(crane.getX(2.5)).toBeCloseTo(3.0, 5);
    });

    it('tính đúng toạ độ x khi centerX khác 0 và có startTime offset', () => {
      const centerX = 5.0;
      const startTime = 10.0;
      const crane = new Crane({
        centerX,
        startTime,
        amplitude: CRANE_CONFIG.amplitude,
        basePeriod: CRANE_CONFIG.period,
      });

      // Tại t = startTime (10.0s): bắt đầu tại centerX = 5.0
      expect(crane.getX(10.0)).toBeCloseTo(5.0, 5);

      // Tại t = 10.5s (startTime + T/4): x = 5.0 + 3.0 = 8.0
      expect(crane.getX(10.5)).toBeCloseTo(8.0, 5);

      // Tại t = 11.5s (startTime + 3T/4): x = 5.0 - 3.0 = 2.0
      expect(crane.getX(11.5)).toBeCloseTo(2.0, 5);
    });

    it('tính đúng qua phương thức tĩnh Crane.computeX', () => {
      expect(Crane.computeX(0, 2.0, 3.0, 0, 0)).toBeCloseTo(0, 5);
      expect(Crane.computeX(0.5, 2.0, 3.0, 0, 0)).toBeCloseTo(3.0, 5);
      expect(Crane.computeX(1.5, 2.0, 3.0, 0, 0)).toBeCloseTo(-3.0, 5);
    });
  });

  describe('2. Độ cao cần cẩu (y = topY + 6.0 unit)', () => {
    it('luôn ở độ cao đỉnh tháp + heightAboveTop (6 unit)', () => {
      const crane = new Crane();

      // Khi tháp mới bắt đầu (chỉ có nền móng cao 1.0 unit)
      expect(crane.getY(PHYS_CONFIG.baseHeight)).toBeCloseTo(
        PHYS_CONFIG.baseHeight + CRANE_CONFIG.heightAboveTop,
        5,
      );
      expect(crane.getY(1.0)).toBeCloseTo(7.0, 5);

      // Khi tháp cao 15.5 unit
      expect(crane.getY(15.5)).toBeCloseTo(21.5, 5);
    });
  });

  describe('3. Tăng tốc cẩu mỗi 10 tầng (T giảm 5%, tối thiểu 1.0s)', () => {
    it('giữ nguyên chu kỳ cơ bản 2.0s cho các tầng 0 đến 9', () => {
      for (let floor = 0; floor < 10; floor++) {
        expect(Crane.computePeriod(floor)).toBeCloseTo(2.0, 5);
      }
    });

    it('giảm 5% chu kỳ (nhân 0.95) mỗi khi đạt bội số 10 tầng', () => {
      // Tầng 10–19: T = 2.0 * 0.95 = 1.9s
      expect(Crane.computePeriod(10)).toBeCloseTo(1.9, 5);
      expect(Crane.computePeriod(15)).toBeCloseTo(1.9, 5);
      expect(Crane.computePeriod(19)).toBeCloseTo(1.9, 5);

      // Tầng 20–29: T = 2.0 * 0.95^2 = 1.805s
      expect(Crane.computePeriod(20)).toBeCloseTo(1.805, 5);
      expect(Crane.computePeriod(29)).toBeCloseTo(1.805, 5);

      // Tầng 30: T = 2.0 * 0.95^3 = 1.71475s
      expect(Crane.computePeriod(30)).toBeCloseTo(1.71475, 5);

      // Tầng 60: T = 2.0 * 0.95^6 ≈ 1.47008s
      expect(Crane.computePeriod(60)).toBeCloseTo(2.0 * Math.pow(0.95, 6), 5);
    });

    it('giới hạn chu kỳ tối thiểu minPeriod = 1.0s dù số tầng rất cao', () => {
      // Tầng 150: 2.0 * 0.95^15 ≈ 0.926s -> phải bị clamp về 1.0s
      expect(Crane.computePeriod(150)).toBe(CRANE_CONFIG.minPeriod);
      expect(Crane.computePeriod(300)).toBe(CRANE_CONFIG.minPeriod);
    });

    it('hỗ trợ hiệu ứng cẩu chậm (x1.5) và cẩu nhanh (x0.6)', () => {
      // Cẩu chậm G1: chu kỳ x1.5 -> 2.0 * 1.5 = 3.0s
      expect(Crane.computePeriod(0, 1.5)).toBeCloseTo(3.0, 5);

      // Cẩu nhanh B3: chu kỳ x0.6 -> 2.0 * 0.6 = 1.2s
      expect(Crane.computePeriod(0, 0.6)).toBeCloseTo(1.2, 5);

      // Hiệu ứng kết hợp với tầng cao: không bao giờ thấp hơn 1.0s
      expect(Crane.computePeriod(50, 0.6)).toBe(CRANE_CONFIG.minPeriod);
    });

    it('cập nhật tốc độ trên instance khi setFloors', () => {
      const crane = new Crane();
      expect(crane.getPeriod()).toBeCloseTo(2.0, 5);

      crane.setFloors(10);
      expect(crane.getPeriod()).toBeCloseTo(1.9, 5);

      crane.setFloors(20);
      expect(crane.getPeriod()).toBeCloseTo(1.805, 5);
    });
  });

  describe('4. Vận tốc tức thời và vận tốc ngang khi thả (releaseVx = vx * 0.3)', () => {
    it('tính đúng vận tốc cẩu và vận tốc thả ban đầu của khối', () => {
      const A = 3.0;
      const T = 2.0;
      const omega = (2 * Math.PI) / T; // = PI ≈ 3.14159265
      const maxVx = A * omega; // 3 * PI ≈ 9.424778

      const crane = new Crane({ amplitude: A, basePeriod: T });

      // Tại t = 0: cẩu đi qua vị trí cân bằng sang phải, vx = maxVx
      expect(crane.getVelocity(0)).toBeCloseTo(maxVx, 4);
      // Vận tốc ngang ban đầu của khối = vx * releaseVelFactor (0.3)
      expect(crane.getReleaseVelocity(0)).toBeCloseTo(maxVx * CRANE_CONFIG.releaseVelFactor, 4);

      // Tại t = T/4 (0.5s): cẩu đạt biên phải đổi hướng, vx = 0
      expect(crane.getVelocity(0.5)).toBeCloseTo(0, 4);
      expect(crane.getReleaseVelocity(0.5)).toBeCloseTo(0, 4);

      // Tại t = T/2 (1.0s): cẩu đi qua vị trí cân bằng sang trái, vx = -maxVx
      expect(crane.getVelocity(1.0)).toBeCloseTo(-maxVx, 4);
      expect(crane.getReleaseVelocity(1.0)).toBeCloseTo(-maxVx * CRANE_CONFIG.releaseVelFactor, 4);

      // Tại t = 3T/4 (1.5s): cẩu đạt biên trái đổi hướng, vx = 0
      expect(crane.getVelocity(1.5)).toBeCloseTo(0, 4);
      expect(crane.getReleaseVelocity(1.5)).toBeCloseTo(0, 4);
    });
  });

  describe('5. Cơ chế Cooldown sau khi thả (0.6s)', () => {
    it('khoá thả trong 0.6s sau khi drop và tự mở khoá khi hết cooldown', () => {
      const crane = new Crane();

      // Ban đầu chưa thả: canDrop = true
      expect(crane.canDrop(0)).toBe(true);
      expect(crane.getCooldownRemaining(0)).toBe(0);

      // Thả tại t = 1.0s
      const dropped = crane.recordDrop(1.0);
      expect(dropped).toBe(true);
      expect(crane.getLastDropTime()).toBe(1.0);

      // Ngay sau khi thả tại t = 1.0s: bị khoá
      expect(crane.canDrop(1.0)).toBe(false);
      expect(crane.getCooldownRemaining(1.0)).toBeCloseTo(0.6, 5);

      // Không cho phép recordDrop tiếp trong cooldown
      expect(crane.recordDrop(1.2)).toBe(false);

      // Tại t = 1.3s: đã trôi qua 0.3s, còn 0.3s cooldown
      expect(crane.canDrop(1.3)).toBe(false);
      expect(crane.getCooldownRemaining(1.3)).toBeCloseTo(0.3, 5);

      // Tại t = 1.59s: vẫn còn bị khoá
      expect(crane.canDrop(1.59)).toBe(false);

      // Tại t = 1.6s: vừa đúng 0.6s cooldown -> mở khoá
      expect(crane.canDrop(1.6)).toBe(true);
      expect(crane.getCooldownRemaining(1.6)).toBe(0);

      // Tại t = 2.0s: sẵn sàng thả lần tiếp theo
      expect(crane.canDrop(2.0)).toBe(true);
      expect(crane.recordDrop(2.0)).toBe(true);
      expect(crane.getLastDropTime()).toBe(2.0);
    });

    it('resetCooldown mở khoá tức thì', () => {
      const crane = new Crane();
      crane.recordDrop(5.0);
      expect(crane.canDrop(5.1)).toBe(false);

      crane.resetCooldown();
      expect(crane.canDrop(5.1)).toBe(true);
      expect(crane.getLastDropTime()).toBeNull();
    });
  });

  describe('6. Tích hợp TowerSim và Crane (dropFromCrane)', () => {
    it('thả khối thành công và gán đúng vị trí, vận tốc từ cẩu', async () => {
      const sim = await TowerSim.create();
      const crane = new Crane();

      // Top Y ban đầu là mặt trên nền móng: 1.0 unit
      const topY = sim.getTopY();
      expect(topY).toBe(PHYS_CONFIG.baseHeight);

      // Thả tại t = 0.5s (biên phải, x = 3.0, vx = 0, y = 1.0 + 6.0 = 7.0)
      const blockId = sim.dropFromCrane(crane, 0.5);
      expect(blockId).not.toBeNull();

      const block = sim.getBlock(blockId!);
      expect(block).not.toBeNull();
      expect(block!.x).toBeCloseTo(3.0, 4);
      expect(block!.y).toBeCloseTo(7.0, 4);
      expect(block!.vx).toBeCloseTo(0, 4);
      expect(block!.vy).toBeCloseTo(0, 4);

      // Gọi thả tiếp ngay tại t = 0.7s (trong 0.6s cooldown) -> phải bị từ chối
      const rejectedDrop = sim.dropFromCrane(crane, 0.7);
      expect(rejectedDrop).toBeNull();
      expect(sim.blockCount).toBe(1);

      // Chờ hết cooldown tới t = 1.2s -> thả thành công
      const secondBlockId = sim.dropFromCrane(crane, 1.2);
      expect(secondBlockId).not.toBeNull();
      expect(sim.blockCount).toBe(2);

      sim.dispose();
    });

    it('getState trả về đầy đủ snapshot của cẩu', () => {
      const crane = new Crane();
      const state = crane.getState(0.5, 10.0);

      expect(state.x).toBeCloseTo(3.0, 4);
      expect(state.y).toBeCloseTo(16.0, 4);
      expect(state.vx).toBeCloseTo(0, 4);
      expect(state.releaseVx).toBeCloseTo(0, 4);
      expect(state.period).toBe(2.0);
      expect(state.amplitude).toBe(3.0);
      expect(state.isLocked).toBe(false);
      expect(state.cooldownRemaining).toBe(0);
    });
  });
});
