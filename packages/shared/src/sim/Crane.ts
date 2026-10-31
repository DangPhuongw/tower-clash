import { CRANE_CONFIG } from '../config/constants.js';

export interface CraneOptions {
  /** Toạ độ x trung tâm dao động của cần cẩu. Mặc định 0. */
  centerX?: number;
  /** Biên độ dao động A (đơn vị vật lý). Mặc định CRANE_CONFIG.amplitude (3.0). */
  amplitude?: number;
  /** Chu kỳ cơ bản T (giây). Mặc định CRANE_CONFIG.period (2.0). */
  basePeriod?: number;
  /** Thời điểm bắt đầu dao động (giây). Mặc định 0. */
  startTime?: number;
  /** Số tầng hiện tại của tháp (ảnh hưởng đến việc tăng tốc chu kỳ). Mặc định 0. */
  floors?: number;
  /** Hệ số nhân chu kỳ từ hiệu ứng bài/item (ví dụ 1.5 cẩu chậm, 0.6 cẩu nhanh). Mặc định 1.0. */
  periodMultiplier?: number;
  /** Hệ số nhân biên độ từ hiệu ứng bài/item (ví dụ 1.6 biên độ rộng). Mặc định 1.0. */
  amplitudeMultiplier?: number;
}

export interface CraneState {
  /** Toạ độ x tức thời của cẩu. */
  x: number;
  /** Cao độ y tức thời của cẩu (bằng đỉnh tháp + heightAboveTop). */
  y: number;
  /** Vận tốc ngang tức thời dx/dt của cẩu tại thời điểm t. */
  vx: number;
  /** Vận tốc ngang ban đầu gán cho khối nếu thả tại thời điểm t (= vx × releaseVelFactor). */
  releaseVx: number;
  /** Chu kỳ dao động hiệu dụng T (giây) tại thời điểm t. */
  period: number;
  /** Biên độ dao động hiệu dụng A tại thời điểm t. */
  amplitude: number;
  /** Đang bị khoá thả do cooldown (trong vòng 0.6s sau lần thả trước). */
  isLocked: boolean;
  /** Thời gian còn lại của cooldown (giây, 0 nếu sẵn sàng thả). */
  cooldownRemaining: number;
}

/**
 * Điều khiển cần cẩu dao động ngang mang khối theo mục 3.2 PLAN.md.
 *
 * Công thức:
 * x(t) = centerX + A · sin(2π(t - startTime) / T)
 * y(t) = topY + CRANE_CONFIG.heightAboveTop
 *
 * Cứ mỗi 10 tầng, T giảm 5% (T × 0.95), tối thiểu 1.0 giây.
 * Vận tốc ngang khối khi thả = vận tốc tức thời của cẩu × 0.3.
 * Sau khi thả, cẩu bị khoá 0.6 giây rồi khối mới mới xuất hiện.
 */
export class Crane {
  readonly centerX: number;
  readonly baseAmplitude: number;
  readonly basePeriod: number;
  readonly startTime: number;

  private floors: number;
  private periodMultiplier: number;
  private amplitudeMultiplier: number;
  private lastDropTime: number | null = null;

  /**
   * Tính chu kỳ T (giây) dựa trên số tầng và hệ số nhân.
   * Cứ mỗi CRANE_CONFIG.speedupEvery tầng, chu kỳ nhân với CRANE_CONFIG.speedupFactor,
   * không bao giờ nhỏ hơn CRANE_CONFIG.minPeriod.
   */
  static computePeriod(
    floors: number,
    periodMultiplier = 1.0,
    basePeriod: number = CRANE_CONFIG.period,
  ): number {
    const safeFloors = Math.max(0, Math.floor(floors));
    const speedupSteps = Math.floor(safeFloors / CRANE_CONFIG.speedupEvery);
    const speedupMultiplier = Math.pow(CRANE_CONFIG.speedupFactor, speedupSteps);
    const rawPeriod = basePeriod * speedupMultiplier * periodMultiplier;
    return Math.max(CRANE_CONFIG.minPeriod, rawPeriod);
  }

  /**
   * Tính toạ độ x của cẩu tại thời điểm t:
   * x(t) = centerX + A · sin(2π(t - startTime) / T)
   */
  static computeX(
    t: number,
    period: number,
    amplitude: number = CRANE_CONFIG.amplitude,
    centerX = 0,
    startTime = 0,
  ): number {
    if (period <= 0) return centerX;
    const elapsed = t - startTime;
    const omega = (2 * Math.PI) / period;
    return centerX + amplitude * Math.sin(omega * elapsed);
  }

  /**
   * Tính vận tốc ngang tức thời dx/dt của cẩu tại thời điểm t:
   * dx/dt = A · (2π / T) · cos(2π(t - startTime) / T)
   */
  static computeVelocity(
    t: number,
    period: number,
    amplitude: number = CRANE_CONFIG.amplitude,
    startTime = 0,
  ): number {
    if (period <= 0) return 0;
    const elapsed = t - startTime;
    const omega = (2 * Math.PI) / period;
    return amplitude * omega * Math.cos(omega * elapsed);
  }

  /**
   * Tính vận tốc ngang ban đầu của khối khi thả tại thời điểm t:
   * releaseVx = vx(t) × CRANE_CONFIG.releaseVelFactor
   */
  static computeReleaseVelocity(
    t: number,
    period: number,
    amplitude: number = CRANE_CONFIG.amplitude,
    startTime = 0,
  ): number {
    const craneVx = Crane.computeVelocity(t, period, amplitude, startTime);
    return craneVx * CRANE_CONFIG.releaseVelFactor;
  }

  /**
   * Cao độ y của cần cẩu luôn ở đỉnh tháp + 6 unit.
   */
  static computeY(topY: number): number {
    return topY + CRANE_CONFIG.heightAboveTop;
  }

  constructor(options: CraneOptions = {}) {
    this.centerX = options.centerX ?? 0;
    this.baseAmplitude = options.amplitude ?? CRANE_CONFIG.amplitude;
    this.basePeriod = options.basePeriod ?? CRANE_CONFIG.period;
    this.startTime = options.startTime ?? 0;
    this.floors = options.floors ?? 0;
    this.periodMultiplier = options.periodMultiplier ?? 1.0;
    this.amplitudeMultiplier = options.amplitudeMultiplier ?? 1.0;
  }

  /** Lấy số tầng hiện tại được ghi nhận trên cẩu. */
  getFloors(): number {
    return this.floors;
  }

  /** Cập nhật số tầng tháp để điều chỉnh tốc độ cẩu. */
  setFloors(floors: number): void {
    this.floors = Math.max(0, Math.floor(floors));
  }

  /** Cập nhật các hệ số hiệu ứng (bài / item). */
  setModifiers(modifiers: { periodMultiplier?: number; amplitudeMultiplier?: number }): void {
    if (modifiers.periodMultiplier !== undefined) {
      this.periodMultiplier = modifiers.periodMultiplier;
    }
    if (modifiers.amplitudeMultiplier !== undefined) {
      this.amplitudeMultiplier = modifiers.amplitudeMultiplier;
    }
  }

  /** Lấy chu kỳ dao động hiệu dụng tại số tầng đã thiết lập (hoặc số tầng truyền vào). */
  getPeriod(floors: number = this.floors): number {
    return Crane.computePeriod(floors, this.periodMultiplier, this.basePeriod);
  }

  /** Lấy biên độ dao động hiệu dụng. */
  getAmplitude(): number {
    return this.baseAmplitude * this.amplitudeMultiplier;
  }

  /** Lấy toạ độ x tức thời tại thời điểm t. */
  getX(t: number, floors: number = this.floors): number {
    const period = this.getPeriod(floors);
    const amplitude = this.getAmplitude();
    return Crane.computeX(t, period, amplitude, this.centerX, this.startTime);
  }

  /** Lấy cao độ y của cẩu dựa theo đỉnh tháp topY. */
  getY(topY: number): number {
    return Crane.computeY(topY);
  }

  /** Lấy vận tốc tức thời dx/dt của cẩu tại thời điểm t. */
  getVelocity(t: number, floors: number = this.floors): number {
    const period = this.getPeriod(floors);
    const amplitude = this.getAmplitude();
    return Crane.computeVelocity(t, period, amplitude, this.startTime);
  }

  /** Lấy vận tốc ngang ban đầu sẽ gán cho khối nếu thả tại thời điểm t. */
  getReleaseVelocity(t: number, floors: number = this.floors): number {
    const period = this.getPeriod(floors);
    const amplitude = this.getAmplitude();
    return Crane.computeReleaseVelocity(t, period, amplitude, this.startTime);
  }

  /**
   * Kiểm tra xem có thể thả khối tại thời điểm t hay không (không bị cooldown).
   */
  canDrop(currentTime: number): boolean {
    if (this.lastDropTime === null) return true;
    return currentTime - this.lastDropTime >= CRANE_CONFIG.dropCooldown;
  }

  /**
   * Thời gian cooldown còn lại (giây). Trả về 0 nếu đã sẵn sàng thả.
   */
  getCooldownRemaining(currentTime: number): number {
    if (this.lastDropTime === null) return 0;
    const elapsed = currentTime - this.lastDropTime;
    return Math.max(0, CRANE_CONFIG.dropCooldown - elapsed);
  }

  /** Thời điểm của lần thả gần nhất, hoặc null nếu chưa thả lần nào. */
  getLastDropTime(): number | null {
    return this.lastDropTime;
  }

  /**
   * Ghi nhận một lần thả khối tại thời điểm currentTime.
   * Nếu đang trong thời gian cooldown, trả về false và không cập nhật.
   * Nếu thành công, khoá cẩu và trả về true.
   */
  recordDrop(currentTime: number): boolean {
    if (!this.canDrop(currentTime)) {
      return false;
    }
    this.lastDropTime = currentTime;
    return true;
  }

  /** Đặt lại trạng thái cooldown (mở khoá cẩu ngay lập tức). */
  resetCooldown(): void {
    this.lastDropTime = null;
  }

  /**
   * Đọc snapshot trạng thái đầy đủ của cẩu tại thời điểm t và cao độ đỉnh tháp topY.
   */
  getState(t: number, topY: number, floors: number = this.floors): CraneState {
    const period = this.getPeriod(floors);
    const amplitude = this.getAmplitude();
    const x = Crane.computeX(t, period, amplitude, this.centerX, this.startTime);
    const y = Crane.computeY(topY);
    const vx = Crane.computeVelocity(t, period, amplitude, this.startTime);
    const releaseVx = vx * CRANE_CONFIG.releaseVelFactor;
    const isLocked = !this.canDrop(t);
    const cooldownRemaining = this.getCooldownRemaining(t);

    return {
      x,
      y,
      vx,
      releaseVx,
      period,
      amplitude,
      isLocked,
      cooldownRemaining,
    };
  }
}
