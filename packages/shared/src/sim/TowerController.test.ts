import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics } from './rapier.js';
import { TowerController } from './TowerController.js';
import { CRANE_CONFIG } from '../config/constants.js';

describe('TowerController (Tích hợp TowerSim, Crane, Settle và Điểm)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('khởi tạo thành công với cấu hình mặc định', async () => {
    const controller = await TowerController.create({ baseX: 0 });
    expect(controller.sim.baseX).toBe(0);
    expect(controller.crane.centerX).toBe(0);
    expect(controller.scoreTracker.score).toBe(0);
    expect(controller.placedBlockIds.length).toBe(0);
    expect(controller.isGameOver).toBe(false);
    expect(controller.isSettling).toBe(false);
    controller.dispose();
  });

  it('thả khối từ cẩu, chờ settle và ghi nhận điểm thành công', async () => {
    const controller = await TowerController.create({ baseX: 0 });

    // Cẩu bắt đầu tại t = 0, x = 0 (tâm nền)
    // Thả tại t = 0 với vx = 0 rơi thẳng xuống tâm nền móng
    const blockId = controller.drop(0, { vx: 0 });
    expect(blockId).not.toBeNull();
    expect(controller.isSettling).toBe(true);
    expect(controller.activeBlockId).toBe(blockId);

    // Không thể thả tiếp trong khi đang settling
    expect(controller.drop(0.1)).toBeNull();

    // Cho thế giới chạy từng bước 1/60s cho đến khi settle
    let dropEvent = null;
    for (let step = 0; step < 180; step++) {
      dropEvent = controller.advance(1 / 60);
      if (dropEvent) break;
    }

    expect(dropEvent).not.toBeNull();
    expect(dropEvent?.result).toBe('perfect');
    expect(dropEvent?.score.addedScore).toBe(15); // 10 tầng + 5 bonus
    expect(controller.scoreTracker.score).toBe(15);
    expect(controller.scoreTracker.floors).toBe(1);
    expect(controller.placedBlockIds.length).toBe(1);
    expect(controller.isSettling).toBe(false);

    controller.dispose();
  });

  it('tăng tốc chu kỳ cẩu sau mỗi 10 tầng thành công', async () => {
    const controller = await TowerController.create({ baseX: 0 });
    const initialPeriod = controller.crane.period;
    expect(initialPeriod).toBeCloseTo(CRANE_CONFIG.period, 4);

    // Giả lập trực tiếp đặt 10 tầng
    for (let i = 0; i < 10; i++) {
      controller.scoreTracker.applyResult('success');
    }
    // Cập nhật chu kỳ cẩu cho 10 tầng
    controller.crane.updatePeriodForFloor(controller.scoreTracker.floors);

    // Chu kỳ phải giảm 5%: 2.0 * 0.95 = 1.90s
    expect(controller.crane.period).toBeCloseTo(2.0 * 0.95, 4);

    controller.dispose();
  });

  it('reset() đặt lại trạng thái hoàn toàn sạch sẽ', async () => {
    const controller = await TowerController.create({ baseX: 0 });
    controller.drop(0, { vx: 0 });
    for (let i = 0; i < 180; i++) {
      if (controller.advance(1 / 60)) break;
    }

    expect(controller.scoreTracker.score).toBeGreaterThan(0);
    expect(controller.placedBlockIds.length).toBe(1);

    controller.reset();

    expect(controller.scoreTracker.score).toBe(0);
    expect(controller.scoreTracker.floors).toBe(0);
    expect(controller.placedBlockIds.length).toBe(0);
    expect(controller.activeBlockId).toBeNull();
    expect(controller.isSettling).toBe(false);
    expect(controller.isGameOver).toBe(false);
    expect(controller.sim.getBlocks().length).toBe(0);

    controller.dispose();
  });

  it('tính tất định: hai lần mô phỏng cùng chuỗi input cho kết quả giống hệt nhau', async () => {
    async function runSimRun() {
      const controller = await TowerController.create({ baseX: 0 });
      // Thả 3 khối tại các mốc thời gian cố định
      const times = [0, 2.0, 4.0];
      const results: string[] = [];

      for (const t of times) {
        controller.drop(t);
        for (let step = 0; step < 120; step++) {
          const ev = controller.advance(1 / 60);
          if (ev) {
            results.push(ev.result);
            break;
          }
        }
      }

      const finalScore = controller.scoreTracker.score;
      const snapshot = controller.sim.toSnapshot();
      controller.dispose();
      return { finalScore, results, snapshot };
    }

    const run1 = await runSimRun();
    const run2 = await runSimRun();

    expect(run1.finalScore).toBe(run2.finalScore);
    expect(run1.results).toEqual(run2.results);
    expect(run1.snapshot.length).toBe(run2.snapshot.length);
    for (let i = 0; i < run1.snapshot.length; i++) {
      const b1 = run1.snapshot[i];
      const b2 = run2.snapshot[i];
      expect(b1[1]).toBeCloseTo(b2[1], 5); // x
      expect(b1[2]).toBeCloseTo(b2[2], 5); // y
      expect(b1[3]).toBeCloseTo(b2[3], 5); // angle
    }
  });
});
