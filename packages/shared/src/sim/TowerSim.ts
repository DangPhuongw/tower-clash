import { NET_CONFIG, PHYS_CONFIG } from '../config/constants.js';
import { RAPIER, initPhysics, isPhysicsReady } from './rapier.js';
import type { Collider, RigidBody, World } from '@dimforge/rapier2d-compat';

/** Định danh khối, tăng dần từ 1 trong mỗi TowerSim. */
export type BlockId = number;

/** Thông số tạo một khối. Các trường bỏ trống lấy mặc định từ PHYS_CONFIG. */
export interface BlockSpawn {
  x: number;
  y: number;
  angle?: number;
  vx?: number;
  vy?: number;
  angvel?: number;
  width?: number;
  height?: number;
  mass?: number;
  friction?: number;
  restitution?: number;
}

/** Trạng thái đọc ra của một khối (đơn vị vật lý, trục y hướng lên). */
export interface BlockState {
  id: BlockId;
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  angvel: number;
  width: number;
  height: number;
}

/** Bộ dữ liệu khối gọn cho message snapshot (mục 7.4): [id, x, y, angle, w, h]. */
export type SnapshotBlock = [
  id: BlockId,
  x: number,
  y: number,
  angle: number,
  w: number,
  h: number,
];

export interface TowerSimOptions {
  /** Toạ độ x của tâm nền móng. Mặc định 0. */
  baseX?: number;
}

interface BlockEntry {
  id: BlockId;
  body: RigidBody;
  collider: Collider;
  width: number;
  height: number;
}

/** Sai số dấu phẩy động khi so sánh bộ tích luỹ thời gian với bước cố định. */
const ACCUMULATOR_EPS = 1e-9;

/**
 * Mô phỏng vật lý một tháp, chỉ phụ thuộc Rapier (không phụ thuộc Phaser), chạy được trong Node.
 *
 * Hệ toạ độ: 1 unit = PHYS_CONFIG.pxPerUnit px khi render, trục y hướng lên.
 * Mặt đất có mặt trên ở y = 0. Nền móng là thân tĩnh rộng PHYS_CONFIG.baseWidth,
 * đặt trên mặt đất, mặt trên ở y = PHYS_CONFIG.baseHeight.
 *
 * Bước mô phỏng cố định 1/NET_CONFIG.simHz giây. Dùng advance(dt) cho vòng lặp thời gian thực
 * (bộ tích luỹ) hoặc step() để chạy từng tick một cách tất định.
 */
export class TowerSim {
  static readonly FIXED_DT = 1 / NET_CONFIG.simHz;

  readonly baseX: number;
  readonly baseWidth: number = PHYS_CONFIG.baseWidth;
  readonly baseHeight: number = PHYS_CONFIG.baseHeight;
  /** Cao độ mặt trên nền móng. */
  readonly baseTopY: number = PHYS_CONFIG.baseHeight;
  /** Cao độ mặt đất. */
  readonly groundY: number = 0;

  private world: World | null;
  private readonly groundCollider: Collider;
  private readonly baseCollider: Collider;
  private readonly blocks = new Map<BlockId, BlockEntry>();
  private nextId: BlockId = 1;
  private accumulator = 0;
  private tickCount = 0;

  /** Tạo TowerSim sau khi đảm bảo Rapier đã khởi tạo. */
  static async create(options: TowerSimOptions = {}): Promise<TowerSim> {
    await initPhysics();
    return new TowerSim(options);
  }

  constructor(options: TowerSimOptions = {}) {
    if (!isPhysicsReady()) {
      throw new Error('Rapier chưa được khởi tạo: hãy await initPhysics() trước khi tạo TowerSim.');
    }
    this.baseX = options.baseX ?? 0;

    const world = new RAPIER.World({ x: 0, y: PHYS_CONFIG.gravity });
    world.timestep = TowerSim.FIXED_DT;
    this.world = world;

    const groundBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(this.baseX, -PHYS_CONFIG.groundThickness / 2),
    );
    this.groundCollider = world.createCollider(
      RAPIER.ColliderDesc.cuboid(PHYS_CONFIG.groundWidth / 2, PHYS_CONFIG.groundThickness / 2)
        .setFriction(PHYS_CONFIG.friction)
        .setRestitution(PHYS_CONFIG.restitution),
      groundBody,
    );

    const baseBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(this.baseX, PHYS_CONFIG.baseHeight / 2),
    );
    this.baseCollider = world.createCollider(
      RAPIER.ColliderDesc.cuboid(PHYS_CONFIG.baseWidth / 2, PHYS_CONFIG.baseHeight / 2)
        .setFriction(PHYS_CONFIG.friction)
        .setRestitution(PHYS_CONFIG.restitution),
      baseBody,
    );
  }

  /** Số tick đã chạy. */
  get tick(): number {
    return this.tickCount;
  }

  /** Thời gian mô phỏng (giây) = tick × FIXED_DT. */
  get time(): number {
    return this.tickCount * TowerSim.FIXED_DT;
  }

  /** Tỉ lệ phần dư của bộ tích luỹ (0..1), dùng để nội suy khi render. */
  get alpha(): number {
    return this.accumulator / TowerSim.FIXED_DT;
  }

  get blockCount(): number {
    return this.blocks.size;
  }

  /** Thêm một khối động. Trả về id của khối. */
  spawnBlock(spec: BlockSpawn): BlockId {
    const world = this.requireWorld();
    const width = spec.width ?? PHYS_CONFIG.blockW;
    const height = spec.height ?? PHYS_CONFIG.blockH;

    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spec.x, spec.y)
        .setRotation(spec.angle ?? 0)
        .setLinvel(spec.vx ?? 0, spec.vy ?? 0)
        .setAngvel(spec.angvel ?? 0)
        .setCcdEnabled(true),
    );
    const collider = world.createCollider(
      RAPIER.ColliderDesc.cuboid(width / 2, height / 2)
        .setMass(spec.mass ?? PHYS_CONFIG.mass)
        .setFriction(spec.friction ?? PHYS_CONFIG.friction)
        .setRestitution(spec.restitution ?? PHYS_CONFIG.restitution),
      body,
    );

    const id = this.nextId++;
    this.blocks.set(id, { id, body, collider, width, height });
    return id;
  }

  /** Xoá một khối. Trả về false nếu id không tồn tại. */
  removeBlock(id: BlockId): boolean {
    const entry = this.blocks.get(id);
    if (!entry) return false;
    this.requireWorld().removeRigidBody(entry.body);
    this.blocks.delete(id);
    return true;
  }

  hasBlock(id: BlockId): boolean {
    return this.blocks.has(id);
  }

  /** Chạy đúng một bước cố định 1/simHz giây. */
  step(): void {
    this.requireWorld().step();
    this.tickCount++;
  }

  /** Chạy n bước cố định. */
  stepN(n: number): void {
    for (let i = 0; i < n; i++) this.step();
  }

  /**
   * Cộng dt (giây, thời gian thực) vào bộ tích luỹ rồi chạy số bước cố định tương ứng.
   * Tối đa PHYS_CONFIG.maxStepsPerAdvance bước mỗi lần gọi; phần dư vượt mức bị bỏ.
   * Trả về số bước đã chạy.
   */
  advance(dt: number): number {
    if (!Number.isFinite(dt) || dt <= 0) return 0;
    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator + ACCUMULATOR_EPS >= TowerSim.FIXED_DT) {
      if (steps >= PHYS_CONFIG.maxStepsPerAdvance) {
        this.accumulator = 0;
        break;
      }
      this.step();
      this.accumulator = Math.max(0, this.accumulator - TowerSim.FIXED_DT);
      steps++;
    }
    return steps;
  }

  getBlock(id: BlockId): BlockState | null {
    const entry = this.blocks.get(id);
    return entry ? this.readEntry(entry) : null;
  }

  /** Trạng thái mọi khối, sắp theo id tăng dần. */
  getBlocks(): BlockState[] {
    return [...this.blocks.values()].sort((a, b) => a.id - b.id).map((e) => this.readEntry(e));
  }

  /** Dữ liệu gọn cho snapshot mạng. */
  toSnapshot(): SnapshotBlock[] {
    return this.getBlocks().map((b) => [b.id, b.x, b.y, b.angle, b.width, b.height]);
  }

  /** Khối có đang tiếp xúc với mặt đất (không phải nền móng) hay không. */
  isTouchingGround(id: BlockId): boolean {
    const entry = this.blocks.get(id);
    if (!entry) return false;
    return this.inContact(this.groundCollider, entry.collider);
  }

  /** Khối có đang tiếp xúc trực tiếp với nền móng hay không. */
  isTouchingBase(id: BlockId): boolean {
    const entry = this.blocks.get(id);
    if (!entry) return false;
    return this.inContact(this.baseCollider, entry.collider);
  }

  /** Cao độ điểm cao nhất của tháp (đỉnh AABB khối cao nhất), hoặc mặt nền móng nếu chưa có khối. */
  getTopY(): number {
    let top = this.baseTopY;
    for (const entry of this.blocks.values()) {
      const { y } = entry.body.translation();
      const a = entry.body.rotation();
      const halfExtentY =
        (Math.abs(Math.sin(a)) * entry.width + Math.abs(Math.cos(a)) * entry.height) / 2;
      top = Math.max(top, y + halfExtentY);
    }
    return top;
  }

  /** Giải phóng bộ nhớ WASM. Không dùng được instance sau khi gọi. */
  dispose(): void {
    if (!this.world) return;
    this.world.free();
    this.world = null;
    this.blocks.clear();
  }

  private inContact(a: Collider, b: Collider): boolean {
    let touching = false;
    this.requireWorld().contactPair(a, b, (manifold) => {
      if (manifold.numContacts() > 0) touching = true;
    });
    return touching;
  }

  private readEntry(entry: BlockEntry): BlockState {
    const p = entry.body.translation();
    const v = entry.body.linvel();
    return {
      id: entry.id,
      x: p.x,
      y: p.y,
      angle: entry.body.rotation(),
      vx: v.x,
      vy: v.y,
      angvel: entry.body.angvel(),
      width: entry.width,
      height: entry.height,
    };
  }

  private requireWorld(): World {
    if (!this.world) throw new Error('TowerSim đã bị dispose.');
    return this.world;
  }
}
