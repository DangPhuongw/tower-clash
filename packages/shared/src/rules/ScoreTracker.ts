import { SCORE_CONFIG } from '../config/constants.js';
import type { DropResultType } from '../protocol/index.js';

export interface ScoreDropOptions {
  /** Điểm cộng thêm cho mỗi tầng (ví dụ +2 điểm từ lá bài Số N ở chế độ Race). */
  floorBonus?: number;
}

export interface ScoreDropResult {
  result: DropResultType;
  addedScore: number;
  floorPoints: number;
  bonusPoints: number;
  isComboActive: boolean;
  comboMultiplier: number;
  currentCombo: number;
  totalScore: number;
  floors: number;
}

export interface ScoreState {
  score: number;
  floors: number;
  combo: number;
  maxCombo: number;
  perfectCount: number;
  successCount: number;
  missCount: number;
}

/**
 * Tính điểm cho một lần thả mà không làm thay đổi trạng thái (thuần hàm).
 */
export function computeDropScore(
  result: DropResultType,
  currentCombo: number,
  options: ScoreDropOptions = {},
): {
  addedScore: number;
  floorPoints: number;
  bonusPoints: number;
  nextCombo: number;
  isComboActive: boolean;
  comboMultiplier: number;
} {
  const floorBonus = options.floorBonus ?? 0;

  if (result === 'perfect') {
    const nextCombo = currentCombo + 1;
    const isComboActive = nextCombo >= SCORE_CONFIG.comboStart;
    const comboMultiplier = isComboActive ? SCORE_CONFIG.comboMul : 1.0;

    const baseFloor = SCORE_CONFIG.perFloor + floorBonus;
    const floorPoints = Math.round(baseFloor * comboMultiplier);
    const bonusPoints = SCORE_CONFIG.perfectBonus;
    const addedScore = floorPoints + bonusPoints;

    return {
      addedScore,
      floorPoints,
      bonusPoints,
      nextCombo,
      isComboActive,
      comboMultiplier,
    };
  }

  if (result === 'success') {
    const floorPoints = SCORE_CONFIG.perFloor + floorBonus;
    return {
      addedScore: floorPoints,
      floorPoints,
      bonusPoints: 0,
      nextCombo: 0,
      isComboActive: false,
      comboMultiplier: 1.0,
    };
  }

  // 'miss' hoặc 'collapse'
  return {
    addedScore: 0,
    floorPoints: 0,
    bonusPoints: 0,
    nextCombo: 0,
    isComboActive: false,
    comboMultiplier: 1.0,
  };
}

/**
 * Quản lý điểm số, số tầng và combo (chuỗi Perfect liên tiếp) của một người chơi.
 * Tuân thủ quy tắc mục 3.4 PLAN.md:
 * - Mỗi tầng thành công: 10 điểm.
 * - Perfect: +5 điểm thưởng (tổng 15 điểm).
 * - Từ Perfect thứ 3 liên tiếp trở đi: điểm tầng x1.5 (10 x 1.5 = 15, tổng 20 điểm).
 * - Trượt / Sập: reset combo về 0.
 */
export class ScoreTracker {
  private _score = 0;
  private _floors = 0;
  private _combo = 0;
  private _maxCombo = 0;
  private _perfectCount = 0;
  private _successCount = 0;
  private _missCount = 0;

  get score(): number {
    return this._score;
  }

  get floors(): number {
    return this._floors;
  }

  /** Chuỗi Perfect liên tiếp hiện tại. */
  get combo(): number {
    return this._combo;
  }

  get maxCombo(): number {
    return this._maxCombo;
  }

  get perfectCount(): number {
    return this._perfectCount;
  }

  get successCount(): number {
    return this._successCount;
  }

  get missCount(): number {
    return this._missCount;
  }

  get isComboActive(): boolean {
    return this._combo >= SCORE_CONFIG.comboStart;
  }

  /**
   * Áp dụng kết quả một lần thả và cập nhật điểm số, số tầng và combo.
   */
  applyResult(result: DropResultType, options: ScoreDropOptions = {}): ScoreDropResult {
    const calc = computeDropScore(result, this._combo, options);

    this._combo = calc.nextCombo;
    if (this._combo > this._maxCombo) {
      this._maxCombo = this._combo;
    }

    if (result === 'perfect') {
      this._floors += 1;
      this._perfectCount += 1;
    } else if (result === 'success') {
      this._floors += 1;
      this._successCount += 1;
    } else if (result === 'miss') {
      this._missCount += 1;
    }

    this._score += calc.addedScore;

    return {
      result,
      addedScore: calc.addedScore,
      floorPoints: calc.floorPoints,
      bonusPoints: calc.bonusPoints,
      isComboActive: calc.isComboActive,
      comboMultiplier: calc.comboMultiplier,
      currentCombo: this._combo,
      totalScore: this._score,
      floors: this._floors,
    };
  }

  /**
   * Khấu trừ tầng khi bị phạt sập (ở chế độ Sabotage hoặc Co-op: bỏ 3 tầng).
   */
  removeFloors(count: number): number {
    const actualRemoved = Math.min(this._floors, Math.max(0, count));
    this._floors -= actualRemoved;
    return actualRemoved;
  }

  getState(): Readonly<ScoreState> {
    return {
      score: this._score,
      floors: this._floors,
      combo: this._combo,
      maxCombo: this._maxCombo,
      perfectCount: this._perfectCount,
      successCount: this._successCount,
      missCount: this._missCount,
    };
  }

  reset(): void {
    this._score = 0;
    this._floors = 0;
    this._combo = 0;
    this._maxCombo = 0;
    this._perfectCount = 0;
    this._successCount = 0;
    this._missCount = 0;
  }
}
