# TOWER CLASH - Nhật ký quyết định kiến trúc & kỹ thuật (DECISIONS.md)

| Ngày       | Vấn đề                     | Lựa chọn                                                                   | Lý do                                                                               |
| ---------- | -------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 2026-10-31 | Khởi tạo cấu trúc Monorepo | Dùng `pnpm workspaces` với `apps/client`, `apps/server`, `packages/shared` | Đúng theo yêu cầu mục 2 trong PLAN.md.                                              |
| 2026-10-31 | Framework Server           | Express + Colyseus                                                         | Colyseus theo đặc tả mục 2; Express để mở endpoint `/health` và serve HTTP nếu cần. |
| 2026-10-31 | Cấu hình Bundle Client     | Vite + Phaser 3 + TypeScript                                               | Đáp ứng yêu cầu mục 2 trong PLAN.md; tốc độ dev nhanh và tương thích tốt.           |
