-- =============================================================================
-- menu_seed.sql — Manwah-style demo menu for QR-order project
-- =============================================================================
-- BEFORE YOU RUN:
-- 1) Pick your database name below (default: restaurant_qr).
-- 2) WARNING: This script DELETES existing orders + payments + order_items,
--    then replaces ALL categories + menu_items so inserts succeed cleanly.
--    Skip this file if you must keep live order history; back up first.
-- 3) Images: image_url is NULL — add files later under frontend/public or DB URLs.
-- 4) If Workbench shows Error 1175 (Safe Updates): this script sets SQL_SAFE_UPDATES = 0
--    for the session while deleting/truncating. Re-run Execute after pulling latest file.
-- =============================================================================

USE restaurant_qr;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

DELETE FROM order_items;
DELETE FROM payments;
DELETE FROM orders;
DELETE FROM menu_items;
DELETE FROM categories;

SET SQL_SAFE_UPDATES = 1;
SET FOREIGN_KEY_CHECKS = 1;

ALTER TABLE categories AUTO_INCREMENT = 1;
ALTER TABLE menu_items AUTO_INCREMENT = 1;

-- -----------------------------------------------------------------------------
-- Categories (flat list — matches Manwah-style sidebar under “Món Lẻ” + extras)
-- -----------------------------------------------------------------------------
INSERT INTO categories (id, name) VALUES
  (1,  'Lẩu'),
  (2,  'Heo - Cừu'),
  (3,  'Bò'),
  (4,  'Nội Tạng'),
  (5,  'Hải Sản'),
  (6,  'Đậu Hũ & Đồ Viên'),
  (7,  'Há Cảo & Sủi Cảo'),
  (8,  'Rau & Nấm'),
  (9,  'Mỳ'),
  (10, 'DRINK'),
  (11, 'Ruoubia'),
  (12, 'Buffet'),
  (13, 'Set Menu');

ALTER TABLE categories AUTO_INCREMENT = 14;

-- -----------------------------------------------------------------------------
-- Menu items (price = VND as decimal, same as schema menu_items.price)
-- -----------------------------------------------------------------------------

-- 1 — Lẩu
INSERT INTO menu_items (category_id, name, description, price, image_url, is_available) VALUES
(1, 'Lẩu Mộc Thanh Trà 1/2 nồi', 'Nước lẩu Mộc Thanh Trà — nửa nồi', 99000.00, '/menu/placeholder.svg', 1),
(1, 'Lẩu Mộc Thanh Trà 1/4 nồi', 'Nước lẩu Mộc Thanh Trà — một phần tư nồi', 49000.00, NULL, 1),
(1, 'Lẩu Đài Bắc Ngọc Thạch 1/2 nồi', NULL, 169000.00, '/menu/placeholder.svg', 1),
(1, 'Lẩu Đài Bắc Ngọc Thạch 1/4 nồi', NULL, 99000.00, NULL, 1),
(1, 'Lẩu Mala Hồng Ngọc 1/2 nồi', NULL, 169000.00, '/menu/placeholder.svg', 1),
(1, 'Lẩu Mala Hồng Ngọc 1/4 nồi', NULL, 99000.00, NULL, 1),
(1, 'Lẩu Đài Bắc 1/2 nồi', NULL, 99000.00, NULL, 1),
(1, 'Lẩu Đài Bắc 1/4 nồi', NULL, 69000.00, NULL, 1),
(1, 'Lẩu Mala 1/2 nồi', NULL, 109000.00, NULL, 1),
(1, 'Lẩu Mala 1/4 nồi', NULL, 69000.00, NULL, 1),
(1, 'Lẩu Kim chi 1/2 nồi', NULL, 89000.00, NULL, 1),
(1, 'Lẩu Kim chi 1/4 nồi', NULL, 49000.00, NULL, 1),
(1, 'Lẩu Cà Chua 1/2 nồi', NULL, 109000.00, NULL, 1),
(1, 'Lẩu Cà Chua 1/4 nồi', NULL, 59000.00, NULL, 1),
(1, 'Lẩu Nấm 1/2 nồi', NULL, 89000.00, NULL, 1),
(1, 'Lẩu Nấm 1/4 nồi', NULL, 59000.00, NULL, 1),
(1, 'Lẩu Thái 1/2 nồi', NULL, 89000.00, NULL, 1),
(1, 'Lẩu Thái 1/4 nồi', NULL, 49000.00, NULL, 1);

-- 2 — Heo - Cừu (Thịt Heo Mỹ Vị: giá không thấy trên ảnh — bạn chỉnh sau)
INSERT INTO menu_items (category_id, name, description, price, image_url, is_available) VALUES
(2, 'Sườn Heo Cay', NULL, 69000.00, NULL, 1),
(2, 'Ba chỉ cừu', NULL, 119000.00, NULL, 1),
(2, 'Má heo', NULL, 99000.00, NULL, 1),
(2, 'Bắp Heo Mỹ Cuộn', NULL, 119000.00, NULL, 1),
(2, 'Ba chỉ heo Iberico', NULL, 49000.00, NULL, 1),
(2, 'Nạc vai heo Iberico', NULL, 89000.00, NULL, 1);

-- 3 — Bò
INSERT INTO menu_items (category_id, name, description, price, image_url, is_available) VALUES
(3, 'Thịt bò thái tay', NULL, 119000.00, NULL, 1),
(3, 'Sườn non thượng hạng', NULL, 279000.00, NULL, 1),
(3, 'Sườn bò Hoàng Kim ướp mè', NULL, 129000.00, NULL, 1),
(3, 'Sườn bò Hoàng Kim', NULL, 119000.00, NULL, 1),
(3, 'Thăn ngoại bò tươi', NULL, 99000.00, NULL, 1),
(3, 'Sơn Ngưu Ngũ Hành', NULL, 119000.00, NULL, 1),
(3, 'Gù hoa tươi', NULL, 99000.00, NULL, 1),
(3, 'Combo Bò tươi Phong Hoa', NULL, 279000.00, NULL, 1),
(3, 'Thịt Bò Bông Tuyết Phong Vân', NULL, 300000.00, NULL, 1);

-- 4 — Nội Tạng
INSERT INTO menu_items (category_id, name, description, price, image_url, is_available) VALUES
(4, 'Trứng Gà', NULL, 9000.00, NULL, 1),
(4, 'Gân bò ngũ thảo', NULL, 59000.00, NULL, 1),
(4, 'Trứng cút chiên', NULL, 29000.00, NULL, 1),
(4, 'Giòn Heo', NULL, 179000.00, NULL, 1),
(4, 'Óc Heo', NULL, 69000.00, NULL, 1),
(4, 'Tổ ong bò tàu', NULL, 69000.00, NULL, 1),
(4, 'Dạ dày heo tàu', NULL, 69000.00, NULL, 1),
(4, 'Cuống Tim', NULL, 69000.00, NULL, 1),
(4, 'Vó bò', NULL, 59000.00, NULL, 1);

-- 5 — Hải Sản
INSERT INTO menu_items (category_id, name, description, price, image_url, is_available) VALUES
(5, 'Mực trứng', NULL, 99000.00, NULL, 1),
(5, 'Bạch tuộc khổng lồ', NULL, 99000.00, NULL, 1),
(5, 'Tôm cân đẩu vân', NULL, 249000.00, NULL, 1),
(5, 'Mực Nút (phần nhỏ)', NULL, 65000.00, NULL, 1),
(5, 'Mực Nút (phần lớn)', NULL, 139000.00, NULL, 1),
(5, 'Cá Hồi', NULL, 129000.00, NULL, 1),
(5, 'Sò Điệp', NULL, 239000.00, NULL, 1),
(5, 'Bào Ngư Đen', NULL, 199000.00, NULL, 1),
(5, 'Vẹm Xanh', NULL, 119000.00, NULL, 1);

-- 6 — Đậu Hũ & Đồ Viên
INSERT INTO menu_items (category_id, name, description, price, image_url, is_available) VALUES
(6, 'Bò viên Đài Loan', NULL, 79000.00, NULL, 1),
(6, 'Bò Viên', NULL, 35000.00, NULL, 1),
(6, 'Paste Tôm Bạch Ngọc', NULL, 99000.00, NULL, 1),
(6, 'Ghẹ Handmade', NULL, 139000.00, NULL, 1),
(6, 'Thanh Tôm Sú Cuộn', NULL, 109000.00, NULL, 1),
(6, 'Xúc Xích Phô Mai', NULL, 119000.00, NULL, 1),
(6, 'Xúc Xích Nấm', NULL, 89000.00, NULL, 1),
(6, 'Bánh Gạo Phô Mai', NULL, 65000.00, NULL, 1),
(6, 'Bánh Gạo Khoai Môn', NULL, 39000.00, NULL, 1);

-- 7 — Há Cảo & Sủi Cảo
INSERT INTO menu_items (category_id, name, description, price, image_url, is_available) VALUES
(7, 'Sủi Cảo Tam Phúc', NULL, 19000.00, NULL, 1),
(7, 'Sủi Cảo Ngẫu Tượng', NULL, 19000.00, NULL, 1),
(7, 'Há Cảo Tổng Hợp', NULL, 39000.00, NULL, 1),
(7, 'Há Cảo Tôm', NULL, 49000.00, NULL, 1),
(7, 'Há Cảo Bò', NULL, 49000.00, NULL, 1),
(7, 'Há Cảo Nấm Vuốt Hổ Đen', NULL, 29000.00, NULL, 1);

-- 8 — Rau & Nấm
INSERT INTO menu_items (category_id, name, description, price, image_url, is_available) VALUES
(8, 'Rau Nấm Tổng Hợp', NULL, 99000.00, NULL, 1),
(8, 'Rau Tổng Hợp', NULL, 35000.00, NULL, 1),
(8, 'Nấm Tổng Hợp', NULL, 79000.00, NULL, 1),
(8, 'Nấm Đông Trùng Hạ Thảo', NULL, 89000.00, NULL, 1),
(8, 'Nấm Nhung Hươu', NULL, 89000.00, NULL, 1),
(8, 'Nấm Vị Cua Trắng', NULL, 39000.00, NULL, 1),
(8, 'Nấm Vị Cua Nâu', NULL, 39000.00, NULL, 1),
(8, 'Nấm Trâm Trắng', NULL, 49000.00, NULL, 1),
(8, 'Nấm Tiên', NULL, 39000.00, NULL, 1);

-- 9 — Mỳ
INSERT INTO menu_items (category_id, name, description, price, image_url, is_available) VALUES
(9, 'Mỳ Tươi', NULL, 29000.00, NULL, 1),
(9, 'Mỳ Trùng Khánh', NULL, 39000.00, NULL, 1),
(9, 'Phở Khô', NULL, 15000.00, NULL, 1),
(9, 'Mỳ Rong Biển', NULL, 39000.00, NULL, 1),
(9, 'Bánh Đa Hong Kong', NULL, 39000.00, NULL, 1);

-- 10 — DRINK (Rượu vodka Alligator: giá trên ảnh bị cắt — đặt tạm 399000, bạn sửa sau)
INSERT INTO menu_items (category_id, name, description, price, image_url, is_available) VALUES
(10, 'Nước ép dưa hấu', NULL, 39000.00, NULL, 1),
(10, 'Trà sữa hồng trà L', NULL, 29000.00, NULL, 1),
(10, 'Trà sâm dứa (Bình)', NULL, 19000.00, NULL, 1),
(10, 'Rượu vodka Alligator Deluxe chai 700ml', NULL, 699000.00, NULL, 1),
(10, 'Rượu Haruka Crystal', NULL, 139000.00, NULL, 1),
(10, 'Coca Cola Zero (Lon)', NULL, 39000.00, NULL, 1),
(10, 'Rượu vodka Alligator', 'Giá trên ảnh demo chưa đọc được — cập nhật sau', 399000.00, NULL, 1);

-- 11 — Ruoubia
INSERT INTO menu_items (category_id, name, description, price, image_url, is_available) VALUES
(11, 'Tiger bạc (Lon)', NULL, 35000.00, NULL, 1),
(11, 'Heineken (Lon)', NULL, 45000.00, NULL, 1),
(11, 'Bia tươi (Ly)', NULL, 29000.00, NULL, 1);

-- Quick sanity checks (optional — comment out if you only want inserts)
-- SELECT COUNT(*) AS categories_count FROM categories;
-- SELECT COUNT(*) AS menu_items_count FROM menu_items;
-- SELECT c.name AS category, COUNT(mi.id) AS items FROM categories c LEFT JOIN menu_items mi ON mi.category_id = c.id GROUP BY c.id, c.name ORDER BY c.id;
