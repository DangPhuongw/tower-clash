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
  - [x] **M1.2**: `TowerSim`: tích hợp Rapier, nền móng, khối, bước mô phỏng cố định 60 Hz
  - [x] **M1.3**: Cần cẩu theo công thức sin, tăng tốc mỗi 10 tầng, cooldown sau khi thả
  - [x] **M1.4**: Phát hiện kết quả thả: settle time, Perfect, Miss, Collapse
  - [x] **M1.5**: Tính điểm và combo
  - [x] **M1.6**: GameScene render Phaser: khối, cần cẩu, camera bám đỉnh, HUD điểm
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

### M1.2 – TowerSim: Rapier, nền móng, khối, bước cố định 60 Hz

- [x] `packages/shared/src/sim/rapier.ts`: `initPhysics()` khởi tạo WASM Rapier (`@dimforge/rapier2d-compat`) đúng một lần, chạy được trong Node và trình duyệt.
- [x] `packages/shared/src/sim/TowerSim.ts` (không phụ thuộc Phaser):
  - Thế giới Rapier với trọng lực `PHYS_CONFIG.gravity`, timestep `1/NET_CONFIG.simHz`.
  - Mặt đất tĩnh (mặt trên y = 0) và nền móng tĩnh rộng 4 unit, tâm tại `baseX`.
  - `spawnBlock()` / `removeBlock()`: khối động 2.0 x 0.8, khối lượng 1, ma sát 0.8, độ nảy 0.05 (cho phép ghi đè cho bài/item sau này), bật CCD.
  - Bước cố định: `step()`, `stepN()`, `advance(dt)` với bộ tích luỹ, `alpha` để nội suy render, giới hạn `maxStepsPerAdvance`.
  - Truy vấn: `getBlock()`, `getBlocks()`, `toSnapshot()` (định dạng `[id, x, y, angle, w, h]` mục 7.4), `isTouchingGround()`, `isTouchingBase()`, `getTopY()`, `dispose()`.
- [x] Thêm hằng số `groundWidth`, `groundThickness`, `maxStepsPerAdvance` vào `PHYS_CONFIG`; export `@tower-clash/shared/sim`.
- [x] `TowerSim.test.ts` (14 test): bước 60 Hz, trọng lực, khối nằm trên nền, khối rơi ra ngoài chạm đất, xếp chồng, bộ tích luỹ ở 30/60/144 FPS, chống spiral of death, tính tất định, dispose.
- [x] `pnpm typecheck`, `pnpm test` (29/29), `pnpm lint`, `pnpm build`, Prettier đều qua; đã chạy thử `TowerSim` từ `dist` trong Node.

### M1.3 – Cần cẩu (Crane): dao động sin, tăng tốc theo tầng, cooldown sau thả

- [x] `packages/shared/src/sim/Crane.ts`:
  - Dao động ngang điều hoà theo công thức mục 3.2: $x(t) = \text{centerX} + A \cdot \sin(2\pi(t - t_0) / T)$ với $A = 3.0$ unit, $T = 2.0$ giây.
  - Cao độ cẩu luôn ở đỉnh tháp $y(t) = \text{topY} + 6.0$ unit (`CRANE_CONFIG.heightAboveTop`).
  - Tăng tốc: Cứ mỗi 10 tầng, chu kỳ $T$ giảm 5% ($T \times 0.95$), tối thiểu 1.0 giây (`CRANE_CONFIG.minPeriod`).
  - Hỗ trợ các hệ số điều chỉnh chu kỳ và biên độ (`periodMultiplier`, `amplitudeMultiplier`) chuẩn bị cho hệ thống bài/item (như Cẩu chậm, Cẩu nhanh, Biên độ rộng).
  - Vận tốc tức thời $v_x(t) = A \cdot (2\pi / T) \cdot \cos(\dots)$, vận tốc ban đầu của khối khi thả $= v_x(t) \times 0.3$ (`CRANE_CONFIG.releaseVelFactor`).
  - Cơ chế khoá thả (cooldown): Sau mỗi lần thả, cẩu bị khoá 0.6 giây (`CRANE_CONFIG.dropCooldown`) trước khi khối mới xuất hiện. Hỗ trợ `canDrop()`, `getCooldownRemaining()`, `recordDrop()`, `resetCooldown()`.
- [x] Tích hợp với `TowerSim`:
  - Thêm phương thức `sim.dropFromCrane(crane, time)`: Tự động tính vị trí đỉnh tháp, lấy toạ độ $(x, y)$ và vận tốc ngang $v_x$ từ cẩu, kiểm tra cooldown và tạo khối mới vào thế giới Rapier.
- [x] `Crane.test.ts` (14 unit test toàn diện):
  - Kiểm tra toạ độ $x(t)$ theo các mốc thời gian ($0$, $T/4$, $T/2$, $3T/4$, $T$), kiểm tra toạ độ với `centerX` và `startTime` offset.
  - Kiểm tra cao độ $y$ bám theo đỉnh tháp.
  - Kiểm tra công thức tăng tốc cẩu theo tầng ($0\dots9$, $10$, $20$, $30$, $60$ tầng) và giới hạn chặn dưới 1.0 giây.
  - Kiểm tra vận tốc ngang cẩu và vận tốc thả của khối tại các vị trí biên và cân bằng.
  - Kiểm tra cơ chế khoá cooldown 0.6s sau khi thả.
  - Kiểm tra tích hợp trực tiếp `TowerSim.dropFromCrane()`.
- [x] Toàn bộ test suite: 43/43 tests passed 100%. Toàn bộ pipeline `format`, `lint`, `typecheck`, `build` xanh 100%.

### M1.4 – Phát hiện kết quả thả: settle time, Perfect, Miss, Collapse

- [x] `packages/shared/src/sim/DropEvaluator.ts`:
  - `checkCollapse()`: Kiểm tra điều kiện sập theo mục 3.3 PLAN.md:
    1. Bất kỳ khối đã đặt trước đó chạm đất (`isTouchingGround(id)`).
    2. Trục tháp (từ tâm nền móng $(baseX, baseHeight/2)$ đến tâm khối cao nhất) nghiêng quá 25° (`COLLAPSE_CONFIG.maxTiltDeg`).
  - `isTowerStable()`: Đánh giá trạng thái đứng yên khi toàn bộ khối có vận tốc dài và góc $< 0.05$ (`SETTLE_CONFIG.velEps`).
  - `evaluateSettledDrop()`: Đánh giá phân loại kết quả sau khi ổn định:
    - `collapse`: Tháp bị sập do chạm đất hoặc nghiêng quá 25°.
    - `miss`: Khối mới rơi chạm đất nhưng các khối cũ vẫn đứng vững, combo bị reset, không tính là sập.
    - `perfect`: Khối nằm trên tháp và lệch tâm $\le 5\%$ chiều rộng khối ($0.05 \times 2.0 = 0.10$ unit dung sai theo `SCORE_CONFIG.perfectTolerance`).
    - `success`: Khối nằm trên tháp nhưng lệch tâm $> 5\%$ chiều rộng khối.
  - `DropSettler`: Quản lý tiến trình ổn định của khối rơi: phát hiện sập tức thời giữa chừng, tự động kết thúc sớm nếu đứng yên đủ 0.3s (`SETTLE_CONFIG.stableTime`) hoặc kết thúc ở mốc tối đa 2.0s (`SETTLE_CONFIG.maxTime`).
- [x] `DropEvaluator.test.ts` (14 unit test toàn diện):
  - Bao phủ đủ 4 trường hợp: Perfect, Thành công, Trượt (Miss), Sập (Collapse do khối cũ chạm đất, Collapse do góc nghiêng trục tháp $> 25^\circ$).
  - Kiểm tra settle sớm 0.3s, settle tối đa 2.0s, phát hiện sập tức thời giữa chừng.

### M1.5 – Tính điểm và combo (ScoreTracker)

- [x] `packages/shared/src/rules/ScoreTracker.ts`:
  - Quản lý điểm số, số tầng, chuỗi combo liên tiếp, kỷ lục maxCombo theo mục 3.4 PLAN.md:
    - Thành công (Success): $+10$ điểm (`SCORE_CONFIG.perFloor`), $+1$ tầng, reset combo về 0.
    - Perfect: $+1$ tầng, cộng thưởng $+5$ điểm (`SCORE_CONFIG.perfectBonus`), tăng combo $+1$.
    - Từ Perfect thứ 3 liên tiếp trở đi (`SCORE_CONFIG.comboStart = 3`): Điểm tầng nhân hệ số $\times 1.5$ (`SCORE_CONFIG.comboMul`), tức $10 \times 1.5 = 15$, cộng thưởng $+5 \implies +20$ điểm mỗi tầng.
    - Trượt (Miss): 0 điểm, không tăng tầng, reset combo về 0.
    - Sập (Collapse): reset combo về 0.
  - Hỗ trợ `floorBonus` (chuẩn bị cho lá bài Số N ở chế độ Race), trừ tầng phạt (`removeFloors(3)` cho Sabotage/Co-op), `reset()`, và hàm thuần `computeDropScore()`.
- [x] `packages/shared/src/rules/ScoreTracker.test.ts` (11 unit test toàn diện):
  - Kiểm tra chính xác bảng điểm, chuỗi combo liên tiếp 1, 2, 3, 4, phá chuỗi combo khi gặp Thành công bình thường, Trượt, Sập, và trừ tầng phạt.

### M1.6 – GameScene Phaser & Luyện tập offline

- [x] `packages/shared/src/sim/TowerController.ts`:
  - Hợp nhất `TowerSim`, `Crane`, `DropSettler`, `ScoreTracker` thành một controller hoàn chỉnh dùng chung cho cả client và server.
  - Tự động điều khiển chu kỳ tăng tốc cẩu (giảm 5% sau mỗi 10 tầng), tự động dọn khối trượt khỏi thế giới vật lý, cung cấp snapshot và sự kiện kết thúc thả `DropEvent`.
  - Hỗ trợ `drop(time, spawnOverrides)` cho phép ghi đè vận tốc ban đầu khi cần.
  - `TowerController.test.ts` (5 test): Thả khối, settle, tính điểm, tăng tốc cẩu, reset, và kiểm tra tính tất định (cùng seed/input cho kết quả giống hệt nhau).
- [x] `apps/client/src/scenes/GameScene.ts`:
  - Render đồ hoạ hoàn toàn bằng Phaser Graphics (không dùng physics của Phaser, tuân thủ nghiêm ngặt mục 2):
    - Khối tháp: bo góc hiện đại, đổ bóng gradient, hiển thị góc xoay vật lý chính xác.
    - Cần cẩu: thanh ray trên cùng, xe cẩu trượt dao động theo $x(t)$, dây cáp treo, móc cẩu và khối mẫu ngậm ở móc khi sẵn sàng.
    - Nền móng & mặt đất: bệ đá vững chắc có vạch tâm neon, mặt đất phía dưới.
    - Bầu trời ban đêm sâu thẳm với lớp sao parallax di chuyển theo cao độ.
  - Camera bám đỉnh: Tự động cuộn mượt mà theo đỉnh tháp với lerp 0.1 (`CAMERA_CONFIG.lerp`), giữ đỉnh tháp và cần cẩu luôn ở vùng trung tâm tầm nhìn.
  - HUD thông tin đầy đủ & đẹp mắt:
    - Điểm số to rõ, số tầng hiện tại.
    - Huy hiệu Combo nổi bật kèm nhãn x1.5 ĐIỂM khi đạt từ 3 Perfect liên tiếp trở lên.
    - Thanh tiến trình nạp khối / cooldown (0.6s).
    - Thông báo nổi (Floating Toast): hiển thị ngay lập tức "PERFECT! +15/+20", "THÀNH CÔNG! +10", "TRƯỢT! 0 ĐIỂM", "SẬP THÁP!".
    - Hiệu ứng rung màn hình khi sập và hạt phát sáng (sparkles) khi Perfect.
    - Hộp thoại Tháp Sập (Game Over Modal) hiển thị tổng kết (Điểm, Tầng, Max Combo, Perfects) và nút "CHƠI LẠI".
  - Điều khiển linh hoạt: Nhấn phím `Space` hoặc click chuột bất kỳ đâu để thả; phím `R` để chơi lại nhanh.
- [x] `apps/client/src/scenes/BootScene.ts`:
  - Giao diện khởi động hiện đại với nút "BẮT ĐẦU LUYỆN TẬP (OFFLINE)", bấm nút hoặc nhấn Space chuyển mượt sang `GameScene`.
- [x] Kiểm thử toàn bộ:
  - 8/8 test files, 73/73 tests passed 100%.
  - Pipeline `lint`, `format`, `typecheck`, `build` xanh 100%.

