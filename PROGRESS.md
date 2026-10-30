# TOWER CLASH - Tiến độ thực hiện

Kế hoạch gốc: [PLAN.md](PLAN.md)

## Checklist các mốc

- [x] **M0 – Khởi tạo dự án**
  - [x] Monorepo pnpm: `apps/client`, `apps/server`, `packages/shared`
  - [x] TypeScript strict, ESLint, Prettier, Vitest
  - [x] CI GitHub Actions (`lint`, `typecheck`, `test`, `build`)
  - [x] Client hiển thị "Tower Clash", server Colyseus có endpoint `/health`
  - [x] Tài liệu gốc: `PROGRESS.md`, `DECISIONS.md`, `BACKLOG.md`, `README.md`
  - [x] Tiêu chí hoàn thành: `pnpm install`, `pnpm build`, `pnpm test` chạy qua, CI sẵn sàng, `pnpm dev` chạy cả 2 app
- [ ] **M1 – Lõi vật lý, chơi offline 1 người (Luyện tập)**
  - [x] **M1.1**: `constants.ts` chứa toàn bộ hằng số mục 9 và thông số hệ thống, không có số hard-code ở chỗ khác
  - [ ] **M1.2**: `TowerSim`: tích hợp Rapier, nền móng, khối, bước mô phỏng cố định 60 Hz
  - [ ] **M1.3**: Cần cẩu theo công thức sin, tăng tốc mỗi 10 tầng, cooldown sau khi thả
  - [ ] **M1.4**: Phát hiện kết quả thả: settle time, Perfect, Miss, Collapse
  - [ ] **M1.5**: Tính điểm và combo
  - [ ] **M1.6**: GameScene render Phaser: khối, cần cẩu, camera bám đỉnh, HUD điểm
  - [ ] **M1.7**: Thử nghiệm gameplay và cảm giác rơi
  - [ ] **M1.8**: Tinh chỉnh hằng số (nếu cần)
- [ ] **M2 – Engine luật bài và item (thuần logic)**
- [ ] **M3 – Server online và chế độ Race**
- [ ] **M4 – Chế độ Phá hoại (Sabotage)**
- [ ] **M5 – Chế độ Cùng xây (Co-op 2v2)**
- [ ] **M6 – Bot, ghép trận, kết nối lại, hoàn thiện UI**
- [ ] **M7 – Kiểm thử, tối ưu, triển khai công khai**

---

## Nhật ký thực hiện

### M0 – Khởi tạo dự án

- [x] Đọc `PLAN.md` và tuân thủ các quy tắc tại mục 0.
- [x] Cài đặt `pnpm` (v12) và cấu hình `pnpm-workspace.yaml`.
- [x] Tạo cấu trúc Monorepo:
  - `packages/shared`: Cấu hình hằng số gameplay (`PHYS_CONFIG`, `CRANE_CONFIG`, `SCORE_CONFIG`, `RACE_CONFIG`, `SABOTAGE_CONFIG`, `COOP_CONFIG`, `CARD_CONFIG`, `ITEM_CONFIG`, `NET_CONFIG`) theo đúng mục 9 của PLAN.md, định nghĩa giao thức protocol.
  - `apps/server`: Node.js + Express + Colyseus server, cung cấp endpoint `GET /health` trả về trạng thái service.
  - `apps/client`: Vite + Phaser 3 + TypeScript, kích thước 1280x720, hiển thị "Tower Clash" trên `BootScene`.
- [x] Thiết lập cấu hình TypeScript strict (`tsconfig.base.json`), ESLint 9 flat config, Prettier, Vitest.
- [x] Tạo workflow GitHub Actions `.github/workflows/ci.yml` kiểm tra `lint`, `typecheck`, `test`, `build`.
- [x] Viết unit tests cho shared config, server health API, client base config (toàn bộ 7/7 test passed).
- [x] Kiểm tra thành công `pnpm install`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm format`, `pnpm dev`.

### M1.1 – Cấu hình hằng số mục 9 (constants.ts)

- [x] Cập nhật đầy đủ và chi tiết toàn bộ các nhóm hằng số theo bảng mục 9 và đặc tả hệ thống vào `packages/shared/src/config/constants.ts`:
  - `PHYS_CONFIG`: gravity (-20), blockW (2.0), blockH (0.8), mass (1.0), friction (0.8), restitution (0.05), pxPerUnit (50), baseWidth (4.0), baseHeight (1.0).
  - `CRANE_CONFIG`: amplitude (3.0), period (2.0), speedupEvery (10), speedupFactor (0.95), minPeriod (1.0), heightAboveTop (6.0), dropCooldown (0.6), releaseVelFactor (0.3).
  - `SETTLE_CONFIG`: maxTime (2.0), velEps (0.05), stableTime (0.3).
  - `COLLAPSE_CONFIG`: maxTiltDeg (25).
  - `SCORE_CONFIG`: perFloor (10), perfectBonus (5), perfectTolerance (0.05), comboStart (3), comboMul (1.5).
  - `CAMERA_CONFIG`: lerp (0.1).
  - `DISPLAY_CONFIG`: width (1280), height (720), minPlayers (1), maxPlayers (4).
  - `RACE_CONFIG`: targetScore (300), matchTime (300), defaultWave (3), waveFloorBonus (2).
  - `SABOTAGE_CONFIG`: dropTimeLimit (10), collapseRemoveFloors (3), speedupFloor (60), speedupPerRound (0.9).
  - `COOP_CONFIG`: targetFloors (25), matchTime (360), dropTimeLimit (10), collapseRemoveFloors (3), collapseLock (3).
  - `CARD_CONFIG`: chooseTime (5), revealTime (1.2).
  - `ITEM_CONFIG`: slots (2), gainEveryFloors (5), gainOnPerfectStreak (3), sabotageGainEveryTurns (2).
  - `BOT_CONFIG`: difficulties (easy, normal, hard với threshold và jitter tương ứng), minReactionTimeMs (150), maxReactionTimeMs (400), specialBlockTiltThresholdDeg (10).
  - `SECURITY_CONFIG`: maxDropPerSec (10), minNicknameLength (2), maxNicknameLength (16).
  - `NET_CONFIG`: defaultPort (2567), simHz (60), snapshotHz (20), interpDelayMs (100), maxLagCompMs (150), reconnectS (30), quickMatchWaitS (20), roomCodeLength (5).
- [x] Loại bỏ hoàn toàn các số hard-code ở client và server:
  - `apps/client/src/gameConfig.ts` sử dụng `DISPLAY_CONFIG.width` và `DISPLAY_CONFIG.height`.
  - `apps/server/src/index.ts` sử dụng `NET_CONFIG.defaultPort`.
- [x] Bổ sung bộ unit test toàn diện cho tất cả các hằng số trong `packages/shared/src/config.test.ts` (11 test case riêng biệt).
- [x] Toàn bộ test suite (15/15 test) passed 100%.
