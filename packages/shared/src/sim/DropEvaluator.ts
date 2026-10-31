import { COLLAPSE_CONFIG, SCORE_CONFIG, SETTLE_CONFIG } from '../config/constants.js';
import type { DropResultType } from '../protocol/index.js';
import type { BlockId, BlockState, TowerSim } from './TowerSim.js';

export interface CollapseStatus {
  collapsed: boolean;
  reason?: 'ground_touch' | 'tilt_exceeded';
  tiltDeg: number;
  failedBlockId?: BlockId;
}

export interface DropEvaluation {
  result: DropResultType;
  activeBlockId: BlockId;
  tiltDeg: number;
  offset: number;
  tolerance: number;
  settleDuration: number;
  settledEarly: boolean;
  collapseReason?: 'ground_touch' | 'tilt_exceeded';
}

/**
 * Kiểm tra trạng thái sập của tháp theo mục 3.3 PLAN.md:
 * 1. Bất kỳ khối đã đặt trước đó chạm đất (`isTouchingGround`).
 * 2. Trục tháp (từ tâm nền đến tâm khối cao nhất) nghiêng quá 25° (`COLLAPSE_CONFIG.maxTiltDeg`).
 */
export function checkCollapse(sim: TowerSim, placedBlockIds: readonly BlockId[]): CollapseStatus {
  // 1. Kiểm tra khối cũ chạm đất
  for (const id of placedBlockIds) {
    if (sim.isTouchingGround(id)) {
      return {
        collapsed: true,
        reason: 'ground_touch',
        tiltDeg: 0,
        failedBlockId: id,
      };
    }
  }

  // 2. Kiểm tra góc nghiêng trục tháp
  if (placedBlockIds.length === 0) {
    return { collapsed: false, tiltDeg: 0 };
  }

  // Tìm khối cao nhất trong danh sách khối đã đặt
  let topBlock: BlockState | null = null;
  for (const id of placedBlockIds) {
    const candidate = sim.getBlock(id);
    if (candidate && (!topBlock || candidate.y > topBlock.y)) {
      topBlock = candidate;
    }
  }

  if (!topBlock) {
    return { collapsed: false, tiltDeg: 0 };
  }

  const dx = topBlock.x - sim.baseX;
  const baseCenterY = sim.baseHeight / 2;
  const dy = topBlock.y - baseCenterY;

  if (dy <= 0) {
    // Khối cao nhất đã rơi xuống ngang hoặc dưới tâm nền móng
    return {
      collapsed: true,
      reason: 'tilt_exceeded',
      tiltDeg: 90,
      failedBlockId: topBlock.id,
    };
  }

  const tiltRad = Math.atan2(Math.abs(dx), dy);
  const tiltDeg = (tiltRad * 180) / Math.PI;

  if (tiltDeg > COLLAPSE_CONFIG.maxTiltDeg) {
    return {
      collapsed: true,
      reason: 'tilt_exceeded',
      tiltDeg,
      failedBlockId: topBlock.id,
    };
  }

  return { collapsed: false, tiltDeg };
}

/**
 * Kiểm tra trạng thái ổn định của toàn bộ thế giới mô phỏng:
 * Vận tốc dài và vận tốc góc của mọi khối đều dưới `SETTLE_CONFIG.velEps` (0.05).
 */
export function isTowerStable(sim: TowerSim, velEps: number = SETTLE_CONFIG.velEps): boolean {
  const blocks = sim.getBlocks();
  for (const b of blocks) {
    const speedSq = b.vx * b.vx + b.vy * b.vy;
    if (speedSq >= velEps * velEps) {
      return false;
    }
    if (Math.abs(b.angvel) >= velEps) {
      return false;
    }
  }
  return true;
}

/**
 * Đánh giá kết quả của một lần thả sau khi khối đã ổn định (mục 3.3 PLAN.md).
 */
export function evaluateSettledDrop(
  sim: TowerSim,
  activeBlockId: BlockId,
  placedBlockIds: readonly BlockId[],
  settleDuration: number = 0,
  settledEarly: boolean = false,
): DropEvaluation {
  // 1. Kiểm tra sập trước trên các khối đã đặt trước đó
  const collapse = checkCollapse(sim, placedBlockIds);
  if (collapse.collapsed) {
    return {
      result: 'collapse',
      activeBlockId,
      tiltDeg: collapse.tiltDeg,
      offset: 0,
      tolerance: 0,
      settleDuration,
      settledEarly,
      collapseReason: collapse.reason,
    };
  }

  const activeBlock = sim.getBlock(activeBlockId);
  if (!activeBlock) {
    return {
      result: 'miss',
      activeBlockId,
      tiltDeg: collapse.tiltDeg,
      offset: 0,
      tolerance: 0,
      settleDuration,
      settledEarly,
    };
  }

  // 2. Khối chạm đất hoặc rơi khỏi nền móng -> Trượt (Miss)
  if (sim.isTouchingGround(activeBlockId) || activeBlock.y < sim.baseTopY) {
    return {
      result: 'miss',
      activeBlockId,
      tiltDeg: collapse.tiltDeg,
      offset: 0,
      tolerance: activeBlock.width * SCORE_CONFIG.perfectTolerance,
      settleDuration,
      settledEarly,
    };
  }

  // Nếu khối nằm trên tháp, kiểm tra thêm độ nghiêng của chính khối mới
  const baseCenterY = sim.baseHeight / 2;
  const dy = activeBlock.y - baseCenterY;
  if (dy > 0) {
    const activeTilt = (Math.atan2(Math.abs(activeBlock.x - sim.baseX), dy) * 180) / Math.PI;
    if (activeTilt > COLLAPSE_CONFIG.maxTiltDeg) {
      return {
        result: 'collapse',
        activeBlockId,
        tiltDeg: activeTilt,
        offset: 0,
        tolerance: 0,
        settleDuration,
        settledEarly,
        collapseReason: 'tilt_exceeded',
      };
    }
  }

  // 3. Khối nằm trên tháp: kiểm tra Perfect hay Thành công
  // Khối bên dưới: nếu là khối đầu tiên thì so với tâm nền móng, ngược lại so với khối trên cùng trước đó
  let refX = sim.baseX;
  let refWidth = activeBlock.width;

  if (placedBlockIds.length > 0) {
    const prevTopId = placedBlockIds[placedBlockIds.length - 1];
    if (prevTopId !== undefined) {
      const prevBlock = sim.getBlock(prevTopId);
      if (prevBlock) {
        refX = prevBlock.x;
        refWidth = prevBlock.width;
      }
    }
  }

  const offset = Math.abs(activeBlock.x - refX);
  // Dung sai Perfect: không quá 5% chiều rộng khối (mục 3.3)
  const tolerance = refWidth * SCORE_CONFIG.perfectTolerance;

  const isPerfect = offset <= tolerance;

  return {
    result: isPerfect ? 'perfect' : 'success',
    activeBlockId,
    tiltDeg: collapse.tiltDeg,
    offset,
    tolerance,
    settleDuration,
    settledEarly,
  };
}

/**
 * Bộ quản lý quá trình ổn định (settle) của một lần thả khối.
 * Theo dõi thời gian tối đa 2.0 giây (`SETTLE_CONFIG.maxTime`) và phát hiện ổn định sớm (0.3s liên tiếp).
 */
export class DropSettler {
  private activeBlockId: BlockId | null = null;
  private placedBlockIds: BlockId[] = [];
  private elapsedTime = 0;
  private stableDuration = 0;
  private settled = false;

  startDrop(activeBlockId: BlockId, placedBlockIds: readonly BlockId[]): void {
    this.activeBlockId = activeBlockId;
    this.placedBlockIds = [...placedBlockIds];
    this.elapsedTime = 0;
    this.stableDuration = 0;
    this.settled = false;
  }

  get isSettling(): boolean {
    return this.activeBlockId !== null && !this.settled;
  }

  get currentActiveBlockId(): BlockId | null {
    return this.activeBlockId;
  }

  get currentElapsedTime(): number {
    return this.elapsedTime;
  }

  /**
   * Cập nhật tiến trình ổn định sau mỗi khoảng thời gian dt (giây).
   * Trả về DropEvaluation nếu vừa đạt trạng thái ổn định hoặc sập, ngược lại trả về null.
   */
  step(sim: TowerSim, dt: number): DropEvaluation | null {
    if (!this.isSettling || this.activeBlockId === null) {
      return null;
    }

    this.elapsedTime += dt;

    // Kiểm tra sập tức thời: nếu tháp sập giữa chừng, kết luận ngay lập tức
    const collapseCheck = checkCollapse(sim, this.placedBlockIds);
    if (collapseCheck.collapsed) {
      this.settled = true;
      return {
        result: 'collapse',
        activeBlockId: this.activeBlockId,
        tiltDeg: collapseCheck.tiltDeg,
        offset: 0,
        tolerance: 0,
        settleDuration: this.elapsedTime,
        settledEarly: true,
        collapseReason: collapseCheck.reason,
      };
    }

    // Đánh giá trạng thái ổn định vận tốc
    if (isTowerStable(sim)) {
      this.stableDuration += dt;
    } else {
      this.stableDuration = 0;
    }

    const settledEarly = this.stableDuration + 1e-9 >= SETTLE_CONFIG.stableTime;
    const reachedMaxTime = this.elapsedTime + 1e-9 >= SETTLE_CONFIG.maxTime;

    if (settledEarly || reachedMaxTime) {
      this.settled = true;
      return evaluateSettledDrop(
        sim,
        this.activeBlockId,
        this.placedBlockIds,
        this.elapsedTime,
        settledEarly,
      );
    }

    return null;
  }

  reset(): void {
    this.activeBlockId = null;
    this.placedBlockIds = [];
    this.elapsedTime = 0;
    this.stableDuration = 0;
    this.settled = false;
  }
}
