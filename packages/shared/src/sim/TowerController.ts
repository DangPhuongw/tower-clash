import { Crane, type CraneOptions } from './Crane.js';
import { DropSettler, type DropEvaluation } from './DropEvaluator.js';
import { TowerSim, type BlockId, type BlockSpawn } from './TowerSim.js';
import { ScoreTracker, type ScoreDropResult } from '../rules/ScoreTracker.js';
import type { DropResultType } from '../protocol/index.js';

export interface TowerControllerOptions {
  baseX?: number;
  craneOptions?: CraneOptions;
}

export interface DropEvent {
  result: DropResultType;
  evaluation: DropEvaluation;
  score: ScoreDropResult;
}

/**
 * Bộ điều khiển hoàn chỉnh cho một tháp:
 * Kết nối thế giới vật lý TowerSim, cần cẩu Crane, bộ đánh giá DropSettler và bảng điểm ScoreTracker.
 * Dùng được cho cả chế độ Luyện tập offline (Phaser) và phòng server Colyseus.
 */
export class TowerController {
  readonly sim: TowerSim;
  readonly crane: Crane;
  readonly scoreTracker: ScoreTracker;
  readonly settler: DropSettler;

  private _placedBlockIds: BlockId[] = [];
  private _activeBlockId: BlockId | null = null;
  private _lastDropEvent: DropEvent | null = null;
  private _isGameOver = false;

  static async create(options: TowerControllerOptions = {}): Promise<TowerController> {
    const sim = await TowerSim.create({ baseX: options.baseX });
    return new TowerController(sim, options);
  }

  constructor(sim: TowerSim, options: TowerControllerOptions = {}) {
    this.sim = sim;
    this.crane = new Crane({
      centerX: options.baseX ?? sim.baseX,
      ...options.craneOptions,
    });
    this.scoreTracker = new ScoreTracker();
    this.settler = new DropSettler();
  }

  get placedBlockIds(): readonly BlockId[] {
    return this._placedBlockIds;
  }

  get activeBlockId(): BlockId | null {
    return this._activeBlockId;
  }

  get isSettling(): boolean {
    return this.settler.isSettling;
  }

  get isGameOver(): boolean {
    return this._isGameOver;
  }

  get lastDropEvent(): DropEvent | null {
    return this._lastDropEvent;
  }

  /**
   * Thả một khối từ cần cẩu.
   * Điều kiện hợp lệ: game chưa kết thúc, không trong quá trình chờ ổn định của khối trước, cẩu hết cooldown.
   * Trả về BlockId nếu thả thành công, ngược lại trả về null.
   */
  drop(time: number = this.sim.time, spawnOverrides: Partial<BlockSpawn> = {}): BlockId | null {
    if (this._isGameOver || this.settler.isSettling) {
      return null;
    }

    if (!this.crane.canDrop(time)) {
      return null;
    }

    const blockId = this.sim.dropFromCrane(this.crane, time, spawnOverrides);
    if (blockId !== null) {
      this._activeBlockId = blockId;
      this.settler.startDrop(blockId, this._placedBlockIds);
    }
    return blockId;
  }

  /**
   * Chạy mô phỏng một khoảng thời gian dt (giây):
   * 1. Cập nhật bước vật lý TowerSim.
   * 2. Nếu đang có khối rơi/ổn định: cập nhật DropSettler.
   * 3. Khi khối đạt trạng thái ổn định: tự động tính điểm, cập nhật tầng, tăng tốc cẩu, dọn khối trượt.
   * Trả về DropEvent nếu một lần thả vừa kết thúc đánh giá trong bước này, ngược lại trả về null.
   */
  advance(dt: number): DropEvent | null {
    this.sim.advance(dt);

    if (this.settler.isSettling) {
      const evaluation = this.settler.step(this.sim, dt);
      if (evaluation) {
        const scoreResult = this.scoreTracker.applyResult(evaluation.result);

        if (evaluation.result === 'perfect' || evaluation.result === 'success') {
          this._placedBlockIds.push(evaluation.activeBlockId);
          // Cứ mỗi 10 tầng, cẩu tăng tốc 5%
          this.crane.updatePeriodForFloor(this.scoreTracker.floors);
        } else if (evaluation.result === 'miss') {
          // Xoá khối trượt khỏi thế giới vật lý để không cản trở các lần thả sau
          this.sim.removeBlock(evaluation.activeBlockId);
        } else if (evaluation.result === 'collapse') {
          this._isGameOver = true;
        }

        this._activeBlockId = null;
        this._lastDropEvent = {
          result: evaluation.result,
          evaluation,
          score: scoreResult,
        };
        return this._lastDropEvent;
      }
    }

    return null;
  }

  /**
   * Đặt lại trò chơi về trạng thái ban đầu để chơi lại.
   */
  reset(): void {
    // Xoá mọi khối còn lại trong thế giới
    const allBlocks = this.sim.getBlocks();
    for (const b of allBlocks) {
      this.sim.removeBlock(b.id);
    }

    this._placedBlockIds = [];
    this._activeBlockId = null;
    this._lastDropEvent = null;
    this._isGameOver = false;

    this.scoreTracker.reset();
    this.settler.reset();
    this.crane.updatePeriodForFloor(0);
    this.crane.resetCooldown();
  }

  dispose(): void {
    this.sim.dispose();
  }
}
