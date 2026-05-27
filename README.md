# QR Ordering System — Final Project

Hệ thống đặt món nhà hàng qua QR: khách quét mã tại bàn, bếp xử lý đơn, thu ngân thanh toán.

## Yêu cầu

- Node.js 18+ (khuyến nghị 22+)
- MySQL 8+
- npm

## Cấu trúc

```
Final-Project/
├── database_schema.sql   # Tạo DB + bảng + 10 bàn
├── menu_seed.sql         # Dữ liệu thực đơn mẫu
├── qr-order-backend/     # API Express (cổng 3000) ← npm run dev ở đây
└── qr-order-frontend/    # Vue 3 + Vite (cổng 5173) ← npm run dev ở đây
```

**Lưu ý:** Không có `package.json` ở thư mục gốc cho app chính — phải `cd` vào `qr-order-backend` hoặc `qr-order-frontend`. Từ gốc có thể dùng: `npm run dev:backend` / `npm run dev:frontend` (sau `npm run install:all`).

## Luồng nghiệp vụ

1. Khách mở `/t/{bàn}` hoặc quét QR trên trang chủ → chọn món → gửi đơn.
2. Bếp (`/admin/kitchen`): `RECEIVED` → `PREPARING` → `COMPLETED`.
3. Thu ngân (`/admin/cashier`): lưới 10 bàn; khách bấm **Gọi thanh toán** → nhãn **Gọi TT**; bill **gộp mọi lượt gọi món** chưa trả của bàn → thanh toán một lần.
4. Khách xem trạng thái tại `/order/{id}`.

VAT mặc định **8%** (tính trên backend khi thêm món).

## Cài đặt

### 1. MySQL (Workbench)

Chạy lần lượt:

1. `database_schema.sql`
2. `menu_seed.sql`

Nếu DB đã tạo từ trước, chạy thêm (nếu thiếu bảng/cột): `migrations/add_table_payment_requests.sql`, `migrations/add_service_ratings.sql`

Ảnh mẫu món (DB đã có sẵn): `migrations/update_menu_sample_images.sql`

Kiểm tra:

```sql
USE restaurant_qr;
SHOW TABLES;
SELECT COUNT(*) FROM menu_items;
```

### 2. Backend

```powershell
cd qr-order-backend
npm install
copy .env.example .env
```

Sửa `DB_PASSWORD` trong `.env` (mật khẩu MySQL của bạn). Nếu `npm run dev` báo không tìm thấy `nodemon`, chạy lại `npm install` hoặc dùng `npm run dev:node`.

Rồi:

```powershell
npm run dev
```

Kiểm tra: http://localhost:3000/health → `{"ok":true}`

### 3. Frontend

```powershell
cd qr-order-frontend
npm install
copy .env.example .env.development
npm run dev
```

Mở http://localhost:5173/

**Không cần đổi IP trong `.env` mỗi lần đổi máy:** dev dùng proxy (`/api` → backend `localhost:3000`). Mã QR trên trang chủ tự dùng đúng URL bạn đang mở (localhost hoặc IP WiFi).

**Demo trên điện thoại (cùng WiFi):** mở `http://<IPv4-máy-bạn>:5173` (xem `ipconfig`), quét QR trên trang chủ — link QR khớp IP đó.

## URL demo

| Vai trò | URL |
|---------|-----|
| Trang chủ + QR 10 bàn (khách) | http://localhost:5173/ |
| Khách bàn 1 | http://localhost:5173/t/1 |
| **Hub nhân viên** | http://localhost:5173/admin |
| Bếp | http://localhost:5173/admin/kitchen |
| Thu ngân | http://localhost:5173/admin/cashier |
| Đánh giá | http://localhost:5173/admin/ratings |

Trang chủ **không** hiển thị link Bếp/Thu ngân — nhân viên bookmark `/admin` trên máy quầy/bếp.

## Tài liệu báo cáo

- [docs/BAO_CAO.md](docs/BAO_CAO.md) — mô tả bài toán, luồng, công nghệ, hạn chế (nộp đồ án).

## Smoke test (báo cáo)

| # | Việc | Kỳ vọng |
|---|------|---------|
| 1 | Mở `/t/1` | Có danh mục và món |
| 2 | Gửi đơn | Chuyển `/order/{id}`, RECEIVED |
| 3 | Bếp: PREPARING → COMPLETED | Đơn hoàn thành |
| 4 | Khách: **Gọi thanh toán (gộp cả bàn)** | Thu ngân thấy nhãn **Gọi TT** trên bàn |
| 5 | Thu ngân: mở bàn → bill gộp món → thanh toán | Tất cả đơn bàn → `PAID` |
| 6 | Khách: tự sang trang cảm ơn → đánh giá | Menu sạch cho lượt mới |
| 7 | Gọi TT khi bếp chưa xong | Nút **Gọi TT** mờ, API từ chối |

## Demo / nộp đồ án

- Quay video 3–5 phút theo bảng Smoke test (khách + `/admin` bếp + thu ngân).
- Chụp screenshot: trang chủ QR, menu, overlay gọi TT, bếp, bill thu ngân, cảm ơn, hub `/admin`.
- File báo cáo: [docs/BAO_CAO.md](docs/BAO_CAO.md).

## Build production (frontend)

```powershell
cd qr-order-frontend
npm run build
```

Thư mục `dist/` dùng deploy tĩnh hoặc serve qua nginx.

## Ảnh món (tùy chọn)

Đặt file vào `qr-order-frontend/public/menu/`, rồi cập nhật DB:

```sql
UPDATE menu_items SET image_url = '/menu/ten-anh.jpg' WHERE id = 1;
```

## Giới hạn hiện tại

- Chưa đăng nhập bảo vệ `/admin/*`.
- Demo local; production cần HTTPS và cấu hình CORS/domain.
- Một số giá trong seed mang tính demo, có thể chỉnh trong `menu_seed.sql`.

## Scripts

| Thư mục | Lệnh |
|---------|------|
| backend | `npm run dev` / `npm start` |
| frontend | `npm run dev` / `npm run build` |
