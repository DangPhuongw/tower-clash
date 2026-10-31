import RAPIER from '@dimforge/rapier2d-compat';

export { RAPIER };

let initPromise: Promise<void> | null = null;
let ready = false;

/**
 * Khởi tạo WASM của Rapier đúng một lần (idempotent).
 * Phải được await trước khi tạo TowerSim. Chạy được cả trong Node và trình duyệt.
 */
export function initPhysics(): Promise<void> {
  if (!initPromise) {
    initPromise = RAPIER.init().then(() => {
      ready = true;
    });
  }
  return initPromise;
}

export function isPhysicsReady(): boolean {
  return ready;
}
