Tower Clash – Kế hoạch thực thi

# **TOWER CLASH – Kế hoạch thực thi (dành cho AI Agent)**

#### **Mục tiêu cuối**

Một game xây tháp nhiều người chơi trên trình duyệt. Ai cũng chơi được qua một đường link công khai, không cần cài đặt, không cần tài khoản. Đây là nguồn thông tin chính thức duy nhất (single source of truth) cho dự án. Làm lần lượt theo đúng thứ tự các mốc từ M0 đến M7.

## **Mục lục**

Trang 1 / 12

Tower Clash – Kế hoạch thực thi

## **0. Quy tắc làm việc cho AI Agent**

1. Làm lần lượt từ M0 đến M7. Chỉ chuyển sang mốc tiếp theo khi mọi tiêu chí "Hoàn thành khi" của mốc hiện tại đã đạt và test đã chạy qua.

2. Giữ tệp PROGRESS.md ở thư mục gốc để đánh dấu checklist từng mốc và ghi ngắn gọn việc đã làm.

3. Gặp chỗ chưa rõ thì chọn phương án đơn giản nhất mà vẫn đúng tinh thần thiết kế, rồi ghi vào DECISIONS.md (ngày, vấn đề, lựa chọn, lý do). Không dừng lại chờ hỏi.

4. Mọi hằng số gameplay đặt trong packages/shared/src/config/, không viết cứng (hard-code) rải rác. Đổi giá trị so với tài liệu này thì phải ghi vào DECISIONS.md.

5. Server là nguồn sự thật (server-authoritative). Client chỉ gửi input và hiển thị.

6. Viết TypeScript ở chế độ strict, tránh dùng any.

7. Mỗi mốc phải có test tự động tương ứng (mục 11).

8. Không thêm tính năng ngoài tài liệu trước khi xong M7. Ý tưởng mới ghi vào BACKLOG.md.

## **1. Tổng quan sản phẩm**

| **Mục**     | **Nội dung**                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên         | Tower Clash                                                                                                                                                                                 |
| Thể loại    | Xây tháp vật lý, nhiều người chơi, party game                                                                                                                                               |
| Nền tảng    | Web trên PC (chuột + bàn phím). Trên mobile chỉ cần giao diện không bị vỡ                                                                                                                   |
| Người chơi  | 1–4 người mỗi phòng, thiếu người thì thêm Bot                                                                                                                                               |
| Tài khoản   | Không cần. Chỉ nhập nickname (lưu ở localStorage)                                                                                                                                           |
| Ngôn ngữ UI | Tiếng Việt (mặc định) và Tiếng Anh                                                                                                                                                          |
| Core loop   | Cần cẩu đung đưa ngang mang theo khối, người chơi bấm để thả. Khối rơi theo vật lý và<br>xếp chồng thành tháp. Đầu mỗi lượt hoặc đợt, người chơi rút một lá bài và lá bài kích hoạt<br>ngay |

**Trụ cột thiết kế:** (1) Dễ hiểu trong 10 giây, chỉ một nút để thả. (2) Hỗn loạn nhưng có kiểm soát: người chơi giỏi vẫn thắng nhiều hơn. (3) Tương tác giữa người chơi: phần lớn bài và item tác động lên người khác.

## **2. Công nghệ bắt buộc**

| **Thành phần**  | **Công nghệ**                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| Ngôn ngữ        | TypeScript 5.x                                                                                                     |
| Monorepo        | pnpm workspaces                                                                                                    |
| Client          | Vite + Phaser 3. Chỉ dùng render/scene/input/audio, không dùng physics của Phaser                                  |
| Vật lý          | @dimforge/rapier2d-compat, dùng chung cho client offline và server                                                 |
| Server          | Node.js 20 + Colyseus (WebSocket)                                                                                  |
| Test            | Vitest (unit), Playwright (e2e)                                                                                    |
| Chất lượng code | ESLint + Prettier; CI bằng GitHub Actions: lint, typecheck, test, build                                            |
| Triển khai      | Client: Cloudflare Pages, Netlify hoặc Vercel. Server: Fly.io hoặc Render (có hỗ trợ<br>WebSocket), kèm Dockerfile |

Trang 2 / 12

Tower Clash – Kế hoạch thực thi

### **Cấu trúc thư mục**

| **Đường dẫn**                | **Vai trò**                                                  |
| ---------------------------- | ------------------------------------------------------------ |
| apps/client/src/scenes       | Boot, Menu, Lobby, Game, Result, Tutorial                    |
| apps/client/src/render       | Vẽ khối, cần cẩu, sương mù, hiệu ứng                         |
| apps/client/src/net          | Kết nối Colyseus, nội suy snapshot                           |
| apps/client/src/ui           | HUD, bài, item, bảng điểm                                    |
| apps/client/src/i18n         | vi.json, en.json                                             |
| apps/server/src/rooms        | RaceRoom, SabotageRoom, CoopRoom                             |
| apps/server/src/bots         | BotController                                                |
| packages/shared/src/config   | constants.ts, cards.ts, items.ts, modes.ts                   |
| packages/shared/src/sim      | TowerSim (Rapier), Crane, phát hiện sập                      |
| packages/shared/src/rules    | Deck, hiệu ứng, thứ tự lượt, tính điểm, chọn mục tiêu        |
| packages/shared/src/protocol | Kiểu dữ liệu message giữa client và server                   |
| Thư mục gốc                  | PROGRESS.md, DECISIONS.md, BACKLOG.md, CREDITS.md, README.md |

## **3. Cơ chế lõi (áp dụng cho mọi chế độ)**

### **3.1 Thế giới và khối**

- 1 unit vật lý tương ứng 50 px khi render.

- Nền móng là thân tĩnh, rộng 4 unit, đặt ở giữa.

- Khối chuẩn: 2.0 x 0.8 unit, khối lượng 1, ma sát 0.8, độ nảy 0.05.

- Trọng lực -20 unit/s² (mạnh hơn thực tế để khối rơi dứt khoát).

### **3.2 Cần cẩu**

- Cần cẩu luôn ở độ cao bằng đỉnh tháp + 6 unit.

- Dao động ngang theo công thức x(t) = centerX + A·sin(2πt/T), với A = 3.0 unit và T = 2.0 giây.

- Cứ mỗi 10 tầng, T giảm 5% (cẩu nhanh hơn), tối thiểu 1.0 giây.

- Bấm chuột trái hoặc Space để thả. Vận tốc ngang ban đầu của khối = vận tốc tức thời của cẩu x 0.3.

- Sau mỗi lần thả, khoá thả 0.6 giây rồi khối mới mới xuất hiện.

### **3.3 Kết quả của một lần thả**

Kết quả được đánh giá sau thời gian ổn định 2.0 giây. Có thể đánh giá sớm hơn nếu vận tốc dài và vận tốc góc của mọi khối đều dưới 0.05 trong 0.3 giây liên tiếp.

| **Kết quả** | **Điều kiện**                                                               | **Hệ quả**                                         |
| ----------- | --------------------------------------------------------------------------- | -------------------------------------------------- |
| Thành công  | Khối nằm trên tháp, không chạm đất                                          | +1 tầng, cộng điểm                                 |
| Perfect     | Thành công và lệch tâm so với khối bên dưới không quá 5%<br>chiều rộng khối | +1 tầng, cộng thưởng, tăng combo                   |
| Trượt       | Khối rơi xuống đất nhưng không kéo khối cũ nào rơi theo                     | Không cộng tầng, reset combo,<br>không tính là sập |

Trang 3 / 12

Tower Clash – Kế hoạch thực thi

| **Kết quả** | **Điều kiện**                                                                                              | **Hệ quả**                     |
| ----------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Sập         | Bất kỳ khối đã đặt trước đó chạm đất, HOẶC trục tháp (từ<br>tâm nền đến tâm khối cao nhất) nghiêng quá 25° | Xử lý theo từng chế độ (mục 4) |

### **3.4 Điểm số và camera**

| **Hạng mục**                      |                | **Giá trị** |
| --------------------------------- | -------------- | ----------- |
| Mỗi tầng thành công               | 10             |             |
| Perfect                           | +5             |             |
| Từ Perfect thứ 3 liên tiếp trở đi | Điểm tầng x1.5 |             |
| Trượt                             | 0, reset combo |             |

Camera bám theo đỉnh tháp, di chuyển mượt (lerp 0.1 mỗi frame). Chế độ có nhiều tháp thì chia màn hình thành nhiều khung (mục 8.2).

## **4. Ba chế độ chơi**

### **4.1 Chế độ A – Thi đấu xây tháp (Race): thời gian thực, 2–4 người**

- Mỗi người có tháp riêng, tất cả chơi đồng thời.

- Thắng khi đạt 300 điểm trước, HOẶC là người cuối cùng còn tháp chưa sập.

- Tháp sập thì người đó bị loại và chuyển sang xem trận.

- Hết 5 phút mà chưa ai thắng: người nhiều điểm nhất thắng. Bằng điểm thì xét tháp cao hơn.

- Rút 1 lá bài khi vào trận, sau đó rút thêm mỗi khi xong một đợt. Một đợt mặc định gồm 3 lần thả thành công. Nếu rút lá Số N, đợt kế tiếp dài N lần thả và mỗi tầng trong đợt đó được +2 điểm.

- "Người sau" là người kế tiếp theo thứ tự ghế, bỏ qua người đã bị loại.

### **4.2 Chế độ B – Phá hoại (Sabotage): theo lượt, 2–4 người**

- Tất cả cùng xây một tháp chung, lần lượt theo vòng.

- Đầu lượt rút 1 lá bài. Lá Số N: phải đặt N khối (lần trượt cũng tính vào số khối). Lá khác: đặt 1 khối.

- Mỗi lần thả có tối đa 10 giây. Hết giờ thì khối tự thả.

- Tháp sập trong lượt của ai thì người đó bị loại. Tháp được khôi phục về trạng thái trước lượt và bỏ 3 tầng trên cùng (còn ít nhất 1 tầng), rồi chuyển lượt cho người kế tiếp.

- Loại dần đến khi còn 1 người, người đó thắng.

- Khi tháp đạt 60 tầng, cẩu tăng tốc 10% mỗi vòng.

- "Người sau" là người kế tiếp theo thứ tự lượt hiện tại (đã tính đến hiệu ứng Đổi chiều vòng).

### **4.3 Chế độ C – Cùng xây (Co-op 2v2)**

- Hai đội, mỗi đội 2 người, mỗi đội một tháp.

- Giữa hai đội chơi thời gian thực; trong đội chơi theo lượt. Mỗi lượt rút bài: lá Số N thì đặt N khối, lá khác thì đặt 1 khối, sau đó chuyển cho đồng đội. Mỗi lần thả tối đa 10 giây.

- Đội nào đạt 25 tầng trước thì thắng. Hết 6 phút thì đội có tháp cao hơn thắng.

- Sập: bỏ 3 tầng trên cùng và đội đó bị khoá thả 3 giây, không bị loại.

- "Người sau" là người sắp tới lượt của đội đối phương.

Trang 4 / 12

Tower Clash – Kế hoạch thực thi

- Bài xấu và item tấn công chỉ nhắm được đội đối phương. Bài tốt có mục tiêu tự chọn chỉ áp dụng cho bản thân hoặc đồng đội.

## **5. Hệ thống bài (Card)**

### **5.1 Quy tắc chung**

- Rút theo trọng số, có hoàn lại nên bộ bài không bao giờ hết. Bài kích hoạt ngay khi rút.

- Mục tiêu SELF: chính người rút. NEXT: "người sau" (định nghĩa theo từng chế độ). CHOSEN: người rút chọn mục tiêu trong 5 giây, hết giờ thì hệ thống chọn ngẫu nhiên.

- Khi đang chọn mục tiêu: ở Race cẩu vẫn chạy; ở chế độ theo lượt thì đồng hồ lượt tạm dừng.

- Nếu không có mục tiêu hợp lệ, lá bài hiện chữ "Vô hiệu".

- Thời lượng hiệu ứng tính bằng số lần thả của người bị tác động.

- Hai hiệu ứng giống nhau không cộng dồn, chỉ làm mới thời lượng và giữ giá trị lớn hơn. Cẩu chậm và cẩu nhanh nhân hệ số với nhau (0.6 x 1.5 = 0.9).

- Bot dùng chung luật bài với người chơi.

### **5.2 Bộ bài 20 lá (config/cards.ts)**

| **ID** | **Tên**                 | **Nhóm** | **Mục tiêu** | **Hiệu ứng**                                            | **Thời**<br>**lượng** | **Trọng số** |
| ------ | ----------------------- | -------- | ------------ | ------------------------------------------------------- | --------------------- | ------------ |
| N1     | Số 1                    | NUMBER   | SELF         | Đợt/lượt dài 1 khối                                     | –                     | 10           |
| N2     | Số 2                    | NUMBER   | SELF         | Đợt/lượt dài 2 khối                                     | –                     | 12           |
| N3     | Số 3                    | NUMBER   | SELF         | Đợt/lượt dài 3 khối                                     | –                     | 12           |
| N4     | Số 4                    | NUMBER   | SELF         | Đợt/lượt dài 4 khối                                     | –                     | 9            |
| N5     | Số 5                    | NUMBER   | SELF         | Đợt/lượt dài 5 khối                                     | –                     | 7            |
| G1     | Cẩu chậm                | GOOD     | SELF         | Chu kỳ cẩu x1.5                                         | 3                     | 5            |
| G2     | Cẩu chậm (tặng)         | GOOD     | CHOSEN       | Chu kỳ cẩu x1.5                                         | 3                     | 3            |
| G3     | Đường ngắm              | GOOD     | SELF         | Hiện vạch dự đoán điểm rơi                              | 3                     | 4            |
| G4     | Khối dính               | GOOD     | SELF         | Khối kế tiếp dính chặt khi chạm                         | 1                     | 3            |
| G5     | Ổn định                 | GOOD     | SELF         | Giảm chấn góc toàn tháp x3                              | 3                     | 2            |
| B1     | Sương mù                | BAD      | NEXT         | Sương che 70% vùng giữa cẩu và đỉnh tháp                | 3                     | 5            |
| B2     | Sương mù (chỉ<br>định)  | BAD      | CHOSEN       | Như B1                                                  | 3                     | 4            |
| B3     | Cẩu nhanh               | BAD      | NEXT         | Chu kỳ cẩu x0.6                                         | 3                     | 5            |
| B4     | Cẩu nhanh (chỉ<br>định) | BAD      | CHOSEN       | Như B3                                                  | 3                     | 4            |
| B5     | Biên độ rộng            | BAD      | NEXT         | Biên độ cẩu x1.6                                        | 3                     | 3            |
| B6     | Khối trơn               | BAD      | CHOSEN       | Ma sát khối = 0.2                                       | 2                     | 3            |
| B7     | Khối nhỏ                | BAD      | NEXT         | Chiều rộng khối x0.7                                    | 2                     | 3            |
| B8     | Cẩu giật                | BAD      | CHOSEN       | Cẩu đảo chiều ngẫu nhiên mỗi 0.5–1.2 giây               | 2                     | 2            |
| S1     | Hoán đổi                | SPECIAL  | CHOSEN       | Hoán đổi toàn bộ hiệu ứng giữa người rút và<br>mục tiêu | –                     | 2            |

Trang 5 / 12

Tower Clash – Kế hoạch thực thi

| **ID** | **Tên**    | **Nhóm** | **Mục tiêu** | **Hiệu ứng**                        | **Thời**<br>**lượng** | **Trọng số** |
| ------ | ---------- | -------- | ------------ | ----------------------------------- | --------------------- | ------------ |
|        |            |          |              |                                     | Đến khi               |              |
| S2     | Phản chiếu | SPECIAL  | SELF         | Phản lá BAD kế tiếp về người gây ra | kích<br>hoạt          | 2            |

Tổng trọng số = 100, gồm NUMBER 50%, BAD 29%, GOOD 17%, SPECIAL 4%.

### **5.3 Kiểu dữ liệu**

CardGroup = 'NUMBER' | 'GOOD' | 'BAD' | 'SPECIAL'; TargetType = 'SELF' | 'NEXT' | 'CHOSEN'. CardDef { id; nameKey; group; target; effect: EffectSpec; durationDrops: number | null; weight }. EffectSpec.kind thuộc: quota, cranePeriodMul, craneAmpMul, aimGuide, glueNext, towerDamping, fog, blockFriction, blockWidthMul, craneJitter, swapEffects, reflectNextBad. Item dùng cùng EffectSpec, bổ sung: weld, heavyBlock, wind, bird, quake, shield, mirror, cleanse, skipTurn, lockFloors, reverseOrder.

## **6. Hệ thống item**

- Khác với bài: bài ngẫu nhiên và kích hoạt ngay, còn item thì người chơi giữ lại và tự chọn lúc dùng.

- Mỗi người có 2 ô item. Khi đã đầy, item mới nhận được sẽ bị bỏ.

- Race và Co-op: nhận 1 item mỗi khi đạt thêm 5 tầng và khi có chuỗi 3 Perfect. Sabotage: nhận 1 item ở các lượt chẵn của mình (lượt thứ 2, 4, 6...).

- Phím Q dùng ô 1, phím E dùng ô 2, hoặc bấm trực tiếp vào ô. Mỗi lần thả chỉ dùng tối đa 1 item.

- Chỉ rút những item hợp lệ với chế độ đang chơi, sau đó chuẩn hoá lại trọng số.

| **ID** | **Nhóm**          | **Tên**   | **Mục tiêu** | **Hiệu ứng**                                                                    | **Chế độ**      | **Trọng**<br>**số** |
| ------ | ----------------- | --------- | ------------ | ------------------------------------------------------------------------------- | --------------- | ------------------- |
| A1     | A – Khối đặc biệt | Keo       | SELF         | Khối kế tiếp được hàn vào khối mà nó chạm<br>đầu tiên                           | Tất cả          | 10                  |
| A2     | A                 | Thép      | SELF         | Khối kế tiếp có khối lượng x2.5, ma sát 1.0,<br>+10 điểm nếu đặt thành công     | Tất cả          | 8                   |
| A3     | A                 | Khối rộng | SELF         | Khối kế tiếp rộng x1.5                                                          | Tất cả          | 10                  |
| A4     | A                 | Bóng bay  | SELF         | Giảm chấn góc toàn tháp x5 trong 3 lần thả                                      | Tất cả          | 7                   |
| B1i    | B – Phòng thủ     | Khiên     | SELF         | Chặn lá BAD hoặc item tấn công kế tiếp<br>nhắm vào mình                         | Tất cả          | 9                   |
| B2i    | B                 | Gương     | SELF         | Phản lá BAD hoặc item tấn công kế tiếp về<br>người gây ra                       | Tất cả          | 6                   |
| B3i    | B                 | Tẩy       | SELF         | Xoá mọi hiệu ứng xấu đang có trên mình                                          | Tất cả          | 8                   |
| C1     | C – Tấn công      | Gió       | CHOSEN       | Đẩy ngang tháp mục tiêu với lực 4 trong 2<br>giây                               | Race, Co-<br>op | 8                   |
| C2     | C                 | Chim      | CHOSEN       | Chim đậu lệch tâm trên khối cao nhất, thêm<br>khối lượng 0.5, kéo dài 3 lần thả | Race, Co-<br>op | 7                   |
| C3     | C                 | Rung đất  | CHOSEN       | Rung nền móng (0.08 unit, 8 Hz) trong 1.5<br>giây                               | Race, Co-<br>op | 6                   |
| C1s    | C (Phá hoại)      | Gió ngầm  | NEXT         | Gió thổi vào tháp chung trong 2 giây đầu<br>lượt của người sau                  | Sabotage        | 7                   |
| D1     | D – Phá hoại      | Bỏ lượt   | SELF         | Bỏ qua lượt hiện tại, chỉ dùng được trước<br>lần thả đầu tiên                   | Sabotage        | 6                   |

Trang 6 / 12

Tower Clash – Kế hoạch thực thi

| **ID** | **Nhóm** | **Tên**        | **Mục tiêu** | **Hiệu ứng**                        | **Chế độ** | **Trọng**<br>**số** |
| ------ | -------- | -------------- | ------------ | ----------------------------------- | ---------- | ------------------- |
| D2     | D        | Chốt tầng      | SELF         | Hàn cứng vĩnh viễn 3 khối trên cùng | Sabotage   | 6                   |
| D3     | D        | Đổi chiều vòng | SELF         | Đảo chiều thứ tự lượt               | Sabotage   | 6                   |

**Thứ tự xử lý phòng thủ:** Khiên được xét trước Gương, mỗi lần chặn hoặc phản sẽ tiêu hao vật phẩm đó. S2 Phản chiếu và Gương không cộng dồn: hiệu ứng nào có trước thì kích hoạt trước. Một hiệu ứng đã bị phản thì không thể phản lại lần nữa.

## **7. Mạng và kiến trúc online**

### **7.1 Mô hình**

- Server mô phỏng Rapier ở 60 Hz và gửi snapshot 20 Hz. Client nội suy snapshot với độ trễ 100 ms.

- Vị trí cẩu tính bằng công thức xác định từ startTime, period và amplitude do server gửi, nên client vẽ cẩu mượt mà không cần snapshot.

- Bù độ trễ: server tính vị trí cẩu tại thời điểm serverNow − min(rtt/2, 150 ms).

### **7.2 Phòng và ghép trận**

- Menu có 4 lựa chọn: Chơi nhanh, Tạo phòng (mã 5 ký tự), Vào phòng bằng mã, Luyện tập (offline, mô phỏng chạy ngay trên client).

- Phòng chờ: danh sách người chơi và nút Sẵn sàng. Chủ phòng thêm/xoá Bot và bấm Bắt đầu.

- Chơi nhanh: chờ tối đa 20 giây, thiếu người thì tự thêm Bot.

### **7.3 Message client → server**

| **Type**           | **Payload**                | **Ghi chú**          |
| ------------------ | -------------------------- | -------------------- |
| ready              | { ready: boolean }         | Phòng chờ            |
| start              | {}                         | Chỉ chủ phòng        |
| addBot / removeBot | { difficulty } / { botId } | Chỉ chủ phòng        |
| drop               | { clientTime }             | Thả khối             |
| chooseTarget       | { targetId }               | Cửa sổ chọn mục tiêu |
| useItem            | { slot: 0                  | 1 }                  |     |
| ping               | { t }                      | Đo RTT               |

### **7.4 Message server → client**

| **Type**                    | **Payload**                                                     |
| --------------------------- | --------------------------------------------------------------- |
| snapshot                    | { t, towers: { ownerId, blocks: [id, x, y, angle, w, h][] }[] } |
| crane                       | { playerId, startTime, period, amplitude, jitter? }             |
| cardDrawn                   | { playerId, cardId, targetId?, needsChoice }                    |
| effectApplied / effectEnded | { targetId, effectKind, sourceId, remainingDrops }              |
| itemGained / itemUsed       | { playerId, itemId, slot, targetId? }                           |
| dropResult                  | { playerId, result: success                                     | perfect | miss | collapse, score, floors } |

Trang 7 / 12

Tower Clash – Kế hoạch thực thi

| **Type**    |                               | **Payload** |
| ----------- | ----------------------------- | ----------- |
| turnChanged | { playerId, quota, deadline } |             |
| eliminated  | { playerId }                  |             |
| gameOver    | { winnerIds, ranking }        |             |
| pong        | { t }                         |             |

State Colyseus Schema chỉ chứa dữ liệu nhẹ: người chơi (id, nickname, team, score, floors, alive, items, activeEffects), mode, phase, currentTurnPlayerId, timeLeft. Vị trí các khối gửi qua message snapshot.

### **7.5 Mất kết nối**

Người chơi được kết nối lại trong 30 giây. Trong thời gian chờ: ở Race và Co-op (phần thời gian thực) thì cẩu không tự thả; ở Sabotage và khi tới lượt trong Co-op thì Bot tạm thời đánh thay. Quá 30 giây thì Bot thay thế vĩnh viễn.

### **7.6 Bot**

|**Độ khó**|**Ngưỡng thả |craneX − topX|**||**Sai số ngẫu nhiên**|
|---|---|---|---|
|easy|0.6 unit|±0.4||
|normal|0.35 unit|±0.2||
|hard|0.15 unit|±0.08||

Thời gian phản ứng 150–400 ms. Bài xấu và item tấn công nhắm vào người đang dẫn điểm; bài tốt dùng cho bản thân hoặc đồng đội. Dùng item phòng thủ khi đang dính hiệu ứng xấu, item tấn công khi đối thủ dẫn điểm, khối đặc biệt khi tháp nghiêng quá 10°.

## **8. Giao diện và trải nghiệm**

### **8.1 Các màn hình**

1. Boot: tải asset, có thanh tiến trình.

2. Menu: nhập nickname, chọn chế độ, 4 nút chơi, cài đặt âm lượng và ngôn ngữ.

3. Hướng dẫn: 4 trang (thả khối, bài, item, 3 chế độ), tự mở ở lần chơi đầu tiên.

4. Phòng chờ.

5. Trận đấu.

6. Kết quả: thứ hạng, điểm, số Perfect, nút Chơi lại và Về menu.

### **8.2 Bố cục trận đấu**

- Race 4 người: tháp của mình chiếm khoảng 60% chiều rộng, 3 tháp còn lại là khung nhỏ bên phải.

- Co-op: chia đôi màn hình, đội mình bên trái. Sabotage: một tháp toàn màn hình, thanh thứ tự lượt ở trên cùng.

- HUD: điểm/tầng, 2 ô item (Q/E), biểu tượng hiệu ứng kèm số lần thả còn lại, đồng hồ trận hoặc đồng hồ lượt.

- Khi rút bài: hoạt ảnh lật bài 1.2 giây, mũi tên chỉ vào mục tiêu, log ở góc màn hình (ví dụ "An dùng Gió lên Bình").

- Cửa sổ chọn mục tiêu: hiện avatar các mục tiêu hợp lệ, phím tắt 1–4.

Trang 8 / 12

Tower Clash – Kế hoạch thực thi

### **8.3 Hình ảnh, âm thanh, khả năng tiếp cận**

- Phong cách flat, màu tươi. Khối vẽ bằng Phaser Graphics, mỗi người chơi một màu.

- Âm thanh tự tạo bằng jsfxr hoặc lấy nguồn CC0 (ghi nguồn vào CREDITS.md): thả, chạm, Perfect, sập, lật bài, dùng item, thắng.

- Rung màn hình nhẹ khi sập, hạt (particle) khi Perfect. Có tuỳ chọn tắt rung và giảm độ đậm sương mù.

- Hỗ trợ màn hình từ 1280x720 trên Chrome, Firefox, Edge, Safari bản mới nhất.

## **9. Hằng số mặc định (config/constants.ts)**

| **Nhóm** | **Giá trị**                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| PHYS     | gravity -20, blockW 2.0, blockH 0.8, friction 0.8, restitution 0.05, pxPerUnit 50                                                          |
| CRANE    | amplitude 3.0, period 2.0, speedupEvery 10, speedupFactor 0.95, minPeriod 1.0, heightAboveTop 6,<br>dropCooldown 0.6, releaseVelFactor 0.3 |
| SETTLE   | maxTime 2.0, velEps 0.05, stableTime 0.3                                                                                                   |
| COLLAPSE | maxTiltDeg 25                                                                                                                              |
| SCORE    | perFloor 10, perfectBonus 5, perfectTolerance 0.05, comboStart 3, comboMul 1.5                                                             |
| RACE     | targetScore 300, matchTime 300, defaultWave 3, waveFloorBonus 2                                                                            |
| SABOTAGE | dropTimeLimit 10, collapseRemoveFloors 3, speedupFloor 60, speedupPerRound 0.9 (nhân vào chu kỳ)                                           |
| COOP     | targetFloors 25, matchTime 360, dropTimeLimit 10, collapseRemoveFloors 3, collapseLock 3                                                   |
| CARD     | chooseTime 5, revealTime 1.2                                                                                                               |
| ITEM     | slots 2, gainEveryFloors 5, gainOnPerfectStreak 3, sabotageGainEveryTurns 2                                                                |
| NET      | simHz 60, snapshotHz 20, interpDelayMs 100, maxLagCompMs 150, reconnectS 30, quickMatchWaitS 20,<br>roomCodeLength 5                       |

Trang 9 / 12

Tower Clash – Kế hoạch thực thi

## **10. Các mốc thực thi (Milestones)**

### **M0 – Khởi tạo dự án**

- Tạo monorepo pnpm gồm apps/client, apps/server, packages/shared; cấu hình TS strict, ESLint, Prettier, Vitest.

- CI GitHub Actions: lint, typecheck, test, build.

- Client hiển thị "Tower Clash", server Colyseus có endpoint /health.

- Tạo PROGRESS.md, DECISIONS.md, BACKLOG.md, README.md.

**Hoàn thành khi:** pnpm install && pnpm build && pnpm test chạy qua; CI xanh; pnpm dev chạy được cả client và server.

### **M1 – Lõi vật lý, chơi offline 1 người (chế độ Luyện tập)**

- Viết TowerSim trong shared/sim, chỉ dùng Rapier, không phụ thuộc Phaser, chạy được trong Node.

- Cần cẩu, thả khối, settle, phân loại kết quả, phát hiện sập, tính điểm, combo, tăng tốc cẩu.

- GameScene render bằng Phaser và camera bám đỉnh tháp.

- Hằng số đặt hết trong constants.ts.

**Hoàn thành khi:** chơi được Luyện tập trong trình duyệt; unit test bao phủ Perfect, Trượt, Sập do khối chạm đất, Sập do nghiêng quá 25°, combo x1.5; mô phỏng cho kết quả giống nhau với cùng seed và chuỗi input.

### **M2 – Engine luật bài và item (thuần logic)**

- Viết cards.ts và items.ts đúng bảng mục 5 và 6; hàm rút theo trọng số có seed.

- Effect engine: áp dụng, đếm lần thả, hết hạn, cộng dồn, Khiên, Gương, Phản chiếu, Hoán đổi.

- Hàm resolveNext(mode, state) và validTargets(mode, state, card) cho cả 3 chế độ.

- Gắn bài và item vào Luyện tập (chỉ nhóm SELF), có UI lật bài, HUD hiệu ứng, ô item Q/E.

**Hoàn thành khi:** có unit test cho từng lá bài và item; test tổng trọng số bài bằng 100; test các quy tắc cộng dồn và thứ tự Khiên trước Gương; Luyện tập hiển thị đúng hiệu ứng sương mù, cẩu nhanh/chậm, khối rộng/nhỏ.

### **M3 – Server online và chế độ Race**

- Viết RaceRoom: tạo phòng có mã, vào phòng, phòng chờ, sẵn sàng, bắt đầu.

- Server chạy mô phỏng 60 Hz, gửi snapshot 20 Hz; client nội suy, bù độ trễ.

- Có đủ luật Race: đợt, bài NEXT/CHOSEN, cửa sổ chọn mục tiêu, loại người chơi, hết giờ, màn hình Kết quả.

- Bố cục 1 khung lớn + 3 khung nhỏ.

**Hoàn thành khi:** 4 tab trình duyệt chơi trọn một trận Race đến gameOver; test tích hợp server (giả lập client) xác nhận điều kiện thắng 300 điểm và người cuối cùng còn trụ.

### **M4 – Chế độ Phá hoại (Sabotage)**

- Viết SabotageRoom: tháp chung, máy trạng thái lượt (rút bài, đặt đủ quota, đánh giá, chuyển lượt), giới hạn 10 giây mỗi lần thả.

- Loại người làm sập tháp, khôi phục tháp và bỏ 3 tầng, loại dần đến khi còn 1 người.

- Item nhóm D và Gió ngầm; thanh thứ tự lượt có hiển thị chiều vòng.

**Hoàn thành khi:** có test cho chuyển lượt, Đổi chiều vòng, Bỏ lượt, khôi phục tháp, tăng tốc từ tầng 60; chơi trọn một trận 4 người.

### **M5 – Chế độ Cùng xây (Co-op 2v2)**

- Viết CoopRoom: chia 2 đội, mỗi đội một tháp, theo lượt trong đội và thời gian thực giữa hai đội.

Trang 10 / 12

Tower Clash – Kế hoạch thực thi

- Phạt khi sập (bỏ 3 tầng, khoá 3 giây), thắng ở 25 tầng hoặc khi hết 6 phút.

- Ràng buộc mục tiêu theo đội; chia đôi màn hình.

**Hoàn thành khi:** có test cho resolveNext trỏ sang đội đối phương và ràng buộc mục tiêu theo đội; chơi trọn một trận 2v2.

### **M6 – Bot, ghép trận, kết nối lại, hoàn thiện UI**

- BotController với 3 độ khó, dùng được trong cả 3 chế độ.

- Chơi nhanh tự ghép người, sau 20 giây thì thêm Bot; kết nối lại trong 30 giây, quá hạn thì Bot thay thế.

- Màn hình Hướng dẫn, i18n vi/en, âm thanh, particle, rung, cài đặt, CREDITS.md.

**Hoàn thành khi:** 1 người cộng 3 Bot chơi trọn được cả 3 chế độ; Bot hard thắng Bot easy ít nhất 70% trong 50 trận mô phỏng headless; mất mạng rồi kết nối lại trong 30 giây thì tiếp tục chơi được.

### **M7 – Kiểm thử, tối ưu, triển khai công khai**

- Viết e2e Playwright: mở menu, tạo phòng, thêm 3 Bot, chơi tới màn Kết quả cho mỗi chế độ.

- Tối ưu: client giữ 60 FPS với 4 tháp x 40 khối; mỗi phòng trên server dùng dưới 5 ms CPU mỗi tick.

- Deploy server (Docker, Fly.io/Render) và client (Pages/Netlify/Vercel); biến môi trường VITE_SERVER_URL; bật HTTPS/WSS; cấu hình CORS.

- README: cách chạy local, cách deploy, link chơi công khai, luật chơi tóm tắt.

**Hoàn thành khi:** mở link công khai trên hai máy ở hai mạng khác nhau và chơi được cùng một phòng; mọi test chạy qua; mục 13 đạt đủ.

## **11. Chiến lược kiểm thử**

| **Loại**          | **Nội dung tối thiểu**                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (shared)     | Sim: kết quả thả, sập, điểm, tính tất định với seed. Rules: rút bài, từng hiệu ứng, cộng dồn, mục tiêu<br>theo từng chế độ, thứ tự lượt     |
| Tích hợp (server) | Dùng @colyseus/testing hoặc client giả lập: vòng đời phòng, điều kiện thắng mỗi chế độ, kết nối lại,<br>Bot thay thế                        |
| Mô phỏng headless | Script chạy N trận chỉ có Bot để đo thời lượng trận trung bình, tỷ lệ thắng theo độ khó, tần suất sập.<br>Kết quả xuất ra balance-report.md |
| E2E (Playwright)  | Mỗi chế độ một kịch bản từ Menu đến Kết quả, kèm kịch bản đổi ngôn ngữ                                                                      |
| Thủ công          | Checklist trong PROGRESS.md: cảm giác thả, đọc rõ hiệu ứng, độ trễ chấp nhận được với ping 150 ms                                           |

Mục tiêu cân bằng (đo bằng mô phỏng headless): một trận Race kéo dài 3–5 phút, Sabotage 4 người 4–8 phút, Co-op 4–6 phút. Nếu lệch, chỉnh hằng số trong config và ghi lại vào DECISIONS.md.

## **12. Bảo mật và chống gian lận cơ bản**

- Server kiểm tra mọi message: đúng phase, đúng lượt, đúng mục tiêu hợp lệ, item có trong ô. Message không hợp lệ thì bỏ qua.

- Giới hạn tần suất: tối đa 10 message drop mỗi giây cho mỗi client.

- Lọc nickname: 2–16 ký tự, bỏ ký tự điều khiển, chặn danh sách từ cấm cơ bản.

- Không lưu dữ liệu cá nhân. Không có chat tự do ở bản đầu (chỉ dùng emote cố định nếu có thời gian).

Trang 11 / 12

Tower Clash – Kế hoạch thực thi

## **13. Định nghĩa hoàn thành sản phẩm (Definition of Done)**

1. Có link công khai HTTPS, mở trên Chrome/Firefox/Edge/Safari là chơi được ngay.

2. Chơi được cả 3 chế độ online, từ 1 người cộng Bot đến 4 người thật.

3. Có đủ 20 lá bài và 14 cấu hình item (13 loại) như tài liệu, hiển thị rõ ai tác động lên ai.

4. Có Luyện tập offline, Hướng dẫn, giao diện tiếng Việt và tiếng Anh, âm thanh, màn hình Kết quả.

5. CI xanh; unit, tích hợp và e2e đều chạy qua.

6. README, PROGRESS.md, DECISIONS.md, CREDITS.md được cập nhật đầy đủ.

## **14. Ngoài phạm vi bản đầu (ghi vào BACKLOG)**

- Tài khoản, xếp hạng (ranked), bảng xếp hạng toàn cầu.

- Điều khiển tối ưu cho mobile.

- Skin khối, trang phục cần cẩu, cửa hàng.

- Chế độ đội 3v3 và 4v4, chế độ khán giả công khai.

- Thử thách hằng ngày, replay.

Trang 12 / 12
