import { describe, expect, it } from 'vitest';
import { SCORE_CONFIG } from '../config/constants.js';
import { ScoreTracker, computeDropScore } from './ScoreTracker.js';

describe('ScoreTracker (M1.5: Tính điểm và combo)', () => {
  it('khởi tạo với điểm 0, tầng 0, combo 0', () => {
    const tracker = new ScoreTracker();
    expect(tracker.score).toBe(0);
    expect(tracker.floors).toBe(0);
    expect(tracker.combo).toBe(0);
    expect(tracker.maxCombo).toBe(0);
    expect(tracker.perfectCount).toBe(0);
    expect(tracker.successCount).toBe(0);
    expect(tracker.missCount).toBe(0);
    expect(tracker.isComboActive).toBe(false);
  });

  describe('Quy tắc tính điểm từng kết quả (mục 3.4)', () => {
    it('thả thành công (Success): +10 điểm, +1 tầng, không tăng combo', () => {
      const tracker = new ScoreTracker();
      const res = tracker.applyResult('success');

      expect(res.addedScore).toBe(SCORE_CONFIG.perFloor); // 10
      expect(res.floorPoints).toBe(10);
      expect(res.bonusPoints).toBe(0);
      expect(res.isComboActive).toBe(false);
      expect(tracker.score).toBe(10);
      expect(tracker.floors).toBe(1);
      expect(tracker.combo).toBe(0);
      expect(tracker.successCount).toBe(1);
    });

    it('thả Perfect lần 1 và 2: +15 điểm (10 điểm tầng + 5 bonus), combo tăng dần', () => {
      const tracker = new ScoreTracker();

      // Perfect 1
      const res1 = tracker.applyResult('perfect');
      expect(res1.addedScore).toBe(15);
      expect(res1.floorPoints).toBe(10);
      expect(res1.bonusPoints).toBe(SCORE_CONFIG.perfectBonus); // 5
      expect(res1.isComboActive).toBe(false);
      expect(tracker.score).toBe(15);
      expect(tracker.floors).toBe(1);
      expect(tracker.combo).toBe(1);
      expect(tracker.maxCombo).toBe(1);
      expect(tracker.perfectCount).toBe(1);

      // Perfect 2
      const res2 = tracker.applyResult('perfect');
      expect(res2.addedScore).toBe(15);
      expect(res2.isComboActive).toBe(false);
      expect(tracker.score).toBe(30);
      expect(tracker.floors).toBe(2);
      expect(tracker.combo).toBe(2);
      expect(tracker.maxCombo).toBe(2);
      expect(tracker.perfectCount).toBe(2);
    });

    it('từ Perfect thứ 3 liên tiếp trở đi: điểm tầng x1.5 (+20 điểm mỗi tầng)', () => {
      const tracker = new ScoreTracker();

      tracker.applyResult('perfect'); // 15 đ, combo 1
      tracker.applyResult('perfect'); // 15 đ, combo 2 (tổng 30)

      // Perfect 3: combo đạt ngưỡng comboStart = 3
      const res3 = tracker.applyResult('perfect');
      expect(res3.currentCombo).toBe(3);
      expect(res3.isComboActive).toBe(true);
      expect(res3.comboMultiplier).toBe(SCORE_CONFIG.comboMul); // 1.5
      // Điểm tầng = 10 * 1.5 = 15; Thưởng Perfect = 5 -> Tổng +20 điểm
      expect(res3.floorPoints).toBe(15);
      expect(res3.bonusPoints).toBe(5);
      expect(res3.addedScore).toBe(20);
      expect(tracker.score).toBe(50); // 30 + 20 = 50
      expect(tracker.isComboActive).toBe(true);

      // Perfect 4: tiếp tục giữ x1.5
      const res4 = tracker.applyResult('perfect');
      expect(res4.currentCombo).toBe(4);
      expect(res4.addedScore).toBe(20);
      expect(tracker.score).toBe(70); // 50 + 20 = 70
      expect(tracker.maxCombo).toBe(4);
    });

    it('thả thành công bình thường làm ngắt chuỗi Perfect liên tiếp (combo về 0)', () => {
      const tracker = new ScoreTracker();

      // Đạt combo 3
      tracker.applyResult('perfect');
      tracker.applyResult('perfect');
      tracker.applyResult('perfect');
      expect(tracker.combo).toBe(3);
      expect(tracker.score).toBe(50);

      // Thả tiếp theo là Success bình thường
      const res = tracker.applyResult('success');
      expect(res.addedScore).toBe(10);
      expect(tracker.score).toBe(60);
      expect(tracker.combo).toBe(0);
      expect(tracker.isComboActive).toBe(false);
      expect(tracker.maxCombo).toBe(3); // Giữ kỷ lục cao nhất
    });

    it('trượt (Miss): 0 điểm, không tăng tầng, reset combo về 0', () => {
      const tracker = new ScoreTracker();
      tracker.applyResult('perfect');
      tracker.applyResult('perfect');
      expect(tracker.combo).toBe(2);
      expect(tracker.floors).toBe(2);

      const res = tracker.applyResult('miss');
      expect(res.addedScore).toBe(0);
      expect(tracker.score).toBe(30);
      expect(tracker.floors).toBe(2); // Số tầng không đổi
      expect(tracker.combo).toBe(0);
      expect(tracker.missCount).toBe(1);
    });

    it('sập (Collapse): reset combo về 0', () => {
      const tracker = new ScoreTracker();
      tracker.applyResult('perfect');
      expect(tracker.combo).toBe(1);

      const res = tracker.applyResult('collapse');
      expect(res.addedScore).toBe(0);
      expect(tracker.combo).toBe(0);
    });
  });

  describe('Các tính năng hỗ trợ chế độ và hiệu ứng', () => {
    it('hỗ trợ floorBonus (cộng điểm mỗi tầng từ bài Số N)', () => {
      const tracker = new ScoreTracker();
      // Thả success với floorBonus = 2: 10 + 2 = 12 điểm
      const resSuccess = tracker.applyResult('success', { floorBonus: 2 });
      expect(resSuccess.addedScore).toBe(12);

      // Thả perfect với floorBonus = 2 khi combo = 0 -> nextCombo = 1: (10 + 2) + 5 = 17 điểm
      const resPerfect = tracker.applyResult('perfect', { floorBonus: 2 });
      expect(resPerfect.addedScore).toBe(17);
    });

    it('hỗ trợ trừ tầng khi bị phạt sập (removeFloors)', () => {
      const tracker = new ScoreTracker();
      for (let i = 0; i < 5; i++) {
        tracker.applyResult('success');
      }
      expect(tracker.floors).toBe(5);

      const removed = tracker.removeFloors(3);
      expect(removed).toBe(3);
      expect(tracker.floors).toBe(2);

      // Không trừ âm quá 0
      const removedExcess = tracker.removeFloors(10);
      expect(removedExcess).toBe(2);
      expect(tracker.floors).toBe(0);
    });

    it('reset() xoá toàn bộ dữ liệu trở về ban đầu', () => {
      const tracker = new ScoreTracker();
      tracker.applyResult('perfect');
      tracker.applyResult('perfect');
      tracker.applyResult('miss');

      tracker.reset();
      expect(tracker.score).toBe(0);
      expect(tracker.floors).toBe(0);
      expect(tracker.combo).toBe(0);
      expect(tracker.maxCombo).toBe(0);
      expect(tracker.perfectCount).toBe(0);
      expect(tracker.missCount).toBe(0);
    });

    it('hàm thuần computeDropScore trả về kết quả dự tính chính xác', () => {
      const calc1 = computeDropScore('perfect', 0);
      expect(calc1.addedScore).toBe(15);
      expect(calc1.nextCombo).toBe(1);

      const calcCombo = computeDropScore('perfect', 2);
      expect(calcCombo.addedScore).toBe(20);
      expect(calcCombo.nextCombo).toBe(3);
      expect(calcCombo.isComboActive).toBe(true);
    });
  });
});
