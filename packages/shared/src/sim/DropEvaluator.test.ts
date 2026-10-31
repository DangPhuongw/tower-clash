import { beforeAll, describe, expect, it } from 'vitest';
import { COLLAPSE_CONFIG, PHYS_CONFIG } from '../config/constants.js';
import { initPhysics } from './rapier.js';
import { TowerSim } from './TowerSim.js';
import { checkCollapse, evaluateSettledDrop, isTowerStable, DropSettler } from './DropEvaluator.js';

describe('DropEvaluator (M1.4: Phân loại kết quả thả và phát hiện sập)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  describe('Phát hiện Sập (checkCollapse)', () => {
    it('tháp không sập khi chưa có khối nào', () => {
      const sim = new TowerSim({ baseX: 0 });
      const status = checkCollapse(sim, []);
      expect(status.collapsed).toBe(false);
      expect(status.tiltDeg).toBe(0);
      sim.dispose();
    });

    it('tháp không sập khi các khối đứng thẳng vững chắc', () => {
      const sim = new TowerSim({ baseX: 0 });
      const b1 = sim.spawnBlock({ x: 0, y: sim.baseTopY + PHYS_CONFIG.blockH / 2 });
      const b2 = sim.spawnBlock({ x: 0, y: sim.baseTopY + PHYS_CONFIG.blockH * 1.5 });

      const status = checkCollapse(sim, [b1, b2]);
      expect(status.collapsed).toBe(false);
      expect(status.tiltDeg).toBeCloseTo(0, 2);
      sim.dispose();
    });

    it('phát hiện sập khi bất kỳ khối đã đặt trước đó chạm đất', () => {
      const sim = new TowerSim({ baseX: 0 });
      // b1 nằm trên nền
      const b1 = sim.spawnBlock({ x: 0, y: sim.baseTopY + PHYS_CONFIG.blockH / 2 });
      // b2 bị rơi ra xa và chạm đất (y = blockH / 2 trên mặt đất y = 0)
      const b2 = sim.spawnBlock({ x: 10, y: PHYS_CONFIG.blockH / 2 });

      // Cho chạy 1 tick để Rapier tính toán tiếp xúc
      sim.step();

      expect(sim.isTouchingGround(b2)).toBe(true);

      const status = checkCollapse(sim, [b1, b2]);
      expect(status.collapsed).toBe(true);
      expect(status.reason).toBe('ground_touch');
      expect(status.failedBlockId).toBe(b2);

      sim.dispose();
    });

    it('phát hiện sập khi trục tháp nghiêng quá 25 độ', () => {
      const sim = new TowerSim({ baseX: 0 });
      // Nền móng tâm tại baseCenterY = 0.5
      // Khối cao nhất tại x = 1.5, y = 3.0:
      // dx = 1.5 - 0 = 1.5, dy = 3.0 - 0.5 = 2.5
      // atan2(1.5, 2.5) = 0.5404 rad = 30.96 độ > 25 độ
      const b1 = sim.spawnBlock({ x: 1.5, y: 3.0 });

      const status = checkCollapse(sim, [b1]);
      expect(status.collapsed).toBe(true);
      expect(status.reason).toBe('tilt_exceeded');
      expect(status.tiltDeg).toBeCloseTo(30.96, 1);
      expect(status.tiltDeg).toBeGreaterThan(COLLAPSE_CONFIG.maxTiltDeg);

      sim.dispose();
    });

    it('tháp không sập khi trục tháp nghiêng dưới 25 độ', () => {
      const sim = new TowerSim({ baseX: 0 });
      // Khối cao nhất tại x = 0.5, y = 3.0:
      // dx = 0.5, dy = 2.5 -> atan2(0.5, 2.5) = 0.1974 rad = 11.31 độ <= 25 độ
      const b1 = sim.spawnBlock({ x: 0.5, y: 3.0 });

      const status = checkCollapse(sim, [b1]);
      expect(status.collapsed).toBe(false);
      expect(status.tiltDeg).toBeCloseTo(11.31, 1);
      expect(status.tiltDeg).toBeLessThanOrEqual(COLLAPSE_CONFIG.maxTiltDeg);

      sim.dispose();
    });
  });

  describe('Đánh giá kết quả thả đã ổn định (evaluateSettledDrop)', () => {
    it('đánh giá Perfect khi lệch tâm <= 5% chiều rộng khối (0.10 unit)', () => {
      const sim = new TowerSim({ baseX: 0 });
      // Dung sai với blockW = 2.0 là 2.0 * 0.05 = 0.10
      // Đặt khối đầu tiên lệch 0.04 (<= 0.10) so với nền baseX = 0
      const b1 = sim.spawnBlock({ x: 0.04, y: sim.baseTopY + PHYS_CONFIG.blockH / 2 });

      const result = evaluateSettledDrop(sim, b1, []);
      expect(result.result).toBe('perfect');
      expect(result.offset).toBeCloseTo(0.04, 3);
      expect(result.tolerance).toBeCloseTo(0.1, 3);

      sim.dispose();
    });

    it('đánh giá Thành công (Success) khi lệch tâm > 5% chiều rộng khối nhưng tháp an toàn', () => {
      const sim = new TowerSim({ baseX: 0 });
      // Lệch 0.35 unit (> 0.10) so với nền baseX = 0
      const b1 = sim.spawnBlock({ x: 0.35, y: sim.baseTopY + PHYS_CONFIG.blockH / 2 });

      const result = evaluateSettledDrop(sim, b1, []);
      expect(result.result).toBe('success');
      expect(result.offset).toBeCloseTo(0.35, 3);
      expect(result.tolerance).toBeCloseTo(0.1, 3);

      sim.dispose();
    });

    it('đánh giá Perfect tầng tiếp theo so với khối bên dưới', () => {
      const sim = new TowerSim({ baseX: 0 });
      // Khối 1 tại x = 0.30
      const b1 = sim.spawnBlock({ x: 0.3, y: sim.baseTopY + PHYS_CONFIG.blockH / 2 });
      // Khối 2 đặt tại x = 0.34 (lệch 0.04 so với khối 1, <= 0.10)
      const b2 = sim.spawnBlock({ x: 0.34, y: sim.baseTopY + PHYS_CONFIG.blockH * 1.5 });

      const result = evaluateSettledDrop(sim, b2, [b1]);
      expect(result.result).toBe('perfect');
      expect(result.offset).toBeCloseTo(0.04, 3);

      sim.dispose();
    });

    it('đánh giá Trượt (Miss) khi khối rơi xuống đất, không tính là sập', () => {
      const sim = new TowerSim({ baseX: 0 });
      // Khối 1 đã đặt an toàn trên nền
      const b1 = sim.spawnBlock({ x: 0, y: sim.baseTopY + PHYS_CONFIG.blockH / 2 });
      // Khối 2 rơi ra ngoài chạm đất (cách xa tâm nền)
      const b2 = sim.spawnBlock({ x: 8.0, y: PHYS_CONFIG.blockH / 2 });

      sim.step();
      expect(sim.isTouchingGround(b2)).toBe(true);
      expect(sim.isTouchingGround(b1)).toBe(false);

      const result = evaluateSettledDrop(sim, b2, [b1]);
      expect(result.result).toBe('miss');

      sim.dispose();
    });

    it('đánh giá Sập khi khối mới làm khối cũ chạm đất', () => {
      const sim = new TowerSim({ baseX: 0 });
      // Khối 1 bị rơi chạm đất
      const b1 = sim.spawnBlock({ x: 5.0, y: PHYS_CONFIG.blockH / 2 });
      const b2 = sim.spawnBlock({ x: 0, y: sim.baseTopY + PHYS_CONFIG.blockH / 2 });

      sim.step();

      const result = evaluateSettledDrop(sim, b2, [b1]);
      expect(result.result).toBe('collapse');
      expect(result.collapseReason).toBe('ground_touch');

      sim.dispose();
    });
  });

  describe('DropSettler (Theo dõi thời gian ổn định)', () => {
    it('nhận biết trạng thái đứng yên isTowerStable', () => {
      const sim = new TowerSim({ baseX: 0 });
      sim.spawnBlock({ x: 0, y: sim.baseTopY + PHYS_CONFIG.blockH / 2 });
      expect(isTowerStable(sim)).toBe(true);

      // Thêm vận tốc cho khối
      sim.spawnBlock({ x: 0, y: 10, vy: -5.0 });
      expect(isTowerStable(sim)).toBe(false);

      sim.dispose();
    });

    it('tự động hoàn thành settle sớm khi khối đứng yên đủ 0.3s', () => {
      const sim = new TowerSim({ baseX: 0 });
      const b1 = sim.spawnBlock({ x: 0, y: sim.baseTopY + PHYS_CONFIG.blockH / 2 });

      const settler = new DropSettler();
      settler.startDrop(b1, []);

      // Khối đứng yên hoàn toàn ngay từ đầu
      let evalResult = null;
      // 0.3s tương đương 18 bước (18 / 60 = 0.3s)
      for (let i = 0; i < 20; i++) {
        evalResult = settler.step(sim, 1 / 60);
        if (evalResult) break;
      }

      expect(evalResult).not.toBeNull();
      expect(evalResult?.result).toBe('perfect');
      expect(evalResult?.settledEarly).toBe(true);
      expect(settler.isSettling).toBe(false);

      sim.dispose();
    });

    it('hoàn thành settle ở mốc tối đa 2.0s', () => {
      const sim = new TowerSim({ baseX: 0 });
      // Giả lập khối luôn chuyển động nhẹ (ví dụ trượt chậm liên tục với vx = 0.1 > velEps)
      const b1 = sim.spawnBlock({ x: 0, y: sim.baseTopY + PHYS_CONFIG.blockH / 2, vx: 0.1 });

      const settler = new DropSettler();
      settler.startDrop(b1, []);

      let evalResult = null;
      // Chạy 120 bước 1/60s = 2.0s
      for (let i = 0; i < 125; i++) {
        evalResult = settler.step(sim, 1 / 60);
        if (evalResult) break;
      }

      expect(evalResult).not.toBeNull();
      expect(settler.currentElapsedTime).toBeGreaterThanOrEqual(1.99);

      sim.dispose();
    });

    it('kích hoạt sập tức thời giữa chừng nếu phát hiện khối cũ chạm đất', () => {
      const sim = new TowerSim({ baseX: 0 });
      // b1 bị rơi chạm đất
      const b1 = sim.spawnBlock({ x: 5.0, y: PHYS_CONFIG.blockH / 2 });
      sim.step(); // tính tiếp xúc với đất
      expect(sim.isTouchingGround(b1)).toBe(true);

      const b2 = sim.spawnBlock({ x: 0, y: 10 }); // Đang rơi

      const settler = new DropSettler();
      settler.startDrop(b2, [b1]);

      const dropOutcome = settler.step(sim, 1 / 60);
      expect(dropOutcome).not.toBeNull();
      expect(dropOutcome?.result).toBe('collapse');

      sim.dispose();
    });
  });
});
