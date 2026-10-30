# Tower Clash

Game xây tháp vật lý nhiều người chơi trên trình duyệt.

## Kiến trúc Monorepo

- `apps/client`: Web client xây dựng bằng Vite, Phaser 3, TypeScript.
- `apps/server`: Game server sử dụng Node.js, Colyseus (WebSocket), Express.
- `packages/shared`: Thư viện dùng chung chứa cấu hình hằng số (`config`), mô phỏng vật lý (`sim`), luật chơi (`rules`), và giao thức (`protocol`).

## Yêu cầu môi trường

- Node.js >= 20
- pnpm >= 9

## Hướng dẫn cài đặt & chạy

```bash
# Cài đặt toàn bộ dependencies
pnpm install

# Build tất cả các package
pnpm build

# Chạy test
pnpm test

# Chạy dev đồng thời cả client và server
pnpm dev
```

- Client: http://localhost:5173
- Server: http://localhost:2567 (Health check: http://localhost:2567/health)
