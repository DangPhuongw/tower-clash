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
