-- Gán ảnh mẫu cho vài món (file: qr-order-frontend/public/menu/placeholder.svg)
USE restaurant_qr;

UPDATE menu_items SET image_url = '/menu/placeholder.svg' WHERE name LIKE 'Lẩu Mộc Thanh Trà%';
UPDATE menu_items SET image_url = '/menu/placeholder.svg' WHERE name LIKE 'Lẩu Đài Bắc Ngọc Thạch%';
UPDATE menu_items SET image_url = '/menu/placeholder.svg' WHERE name LIKE 'Lẩu Mala Hồng Ngọc%';
