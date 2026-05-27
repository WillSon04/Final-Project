-- =============================================================================
-- database_schema.sql — Tạo database + bảng cho QR-order (MySQL 8+)
-- Chạy TRƯỚC menu_seed.sql
-- =============================================================================

CREATE DATABASE IF NOT EXISTS restaurant_qr
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE restaurant_qr;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS service_ratings;
DROP TABLE IF EXISTS table_payment_requests;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS tables;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- Bàn
-- -----------------------------------------------------------------------------
CREATE TABLE tables (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tables_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Thực đơn
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE menu_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id INT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT NULL,
  price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  image_url VARCHAR(500) NULL,
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_menu_items_category (category_id),
  CONSTRAINT fk_menu_items_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Đơn hàng
-- -----------------------------------------------------------------------------
CREATE TABLE orders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  table_id INT UNSIGNED NOT NULL,
  status ENUM('RECEIVED', 'PREPARING', 'COMPLETED', 'PAID') NOT NULL DEFAULT 'RECEIVED',
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  vat DECIMAL(12, 2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_orders_table (table_id),
  KEY idx_orders_status (status),
  CONSTRAINT fk_orders_table
    FOREIGN KEY (table_id) REFERENCES tables (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id INT UNSIGNED NOT NULL,
  menu_item_id INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  note VARCHAR(500) NOT NULL DEFAULT '',
  unit_price DECIMAL(12, 2) NOT NULL,
  line_total DECIMAL(12, 2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id),
  KEY idx_order_items_menu (menu_item_id),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_order_items_menu
    FOREIGN KEY (menu_item_id) REFERENCES menu_items (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id INT UNSIGNED NOT NULL,
  method ENUM('CASH', 'CARD') NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  status ENUM('PAID', 'PENDING', 'FAILED') NOT NULL DEFAULT 'PAID',
  paid_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payments_order (order_id),
  CONSTRAINT fk_payments_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Yêu cầu thanh toán theo bàn (khách bấm "Gọi thanh toán")
CREATE TABLE table_payment_requests (
  table_id INT UNSIGNED NOT NULL,
  status ENUM('PENDING', 'PAID') NOT NULL DEFAULT 'PENDING',
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (table_id),
  CONSTRAINT fk_payment_req_table
    FOREIGN KEY (table_id) REFERENCES tables (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE service_ratings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  table_id INT UNSIGNED NOT NULL,
  stars TINYINT UNSIGNED NOT NULL,
  comment VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ratings_table (table_id),
  CONSTRAINT fk_ratings_table
    FOREIGN KEY (table_id) REFERENCES tables (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10 bàn (khớp KITCHEN_TABLE_COUNT trong frontend)
INSERT INTO tables (id, code, name) VALUES
  (1,  '1',  'Bàn 1'),
  (2,  '2',  'Bàn 2'),
  (3,  '3',  'Bàn 3'),
  (4,  '4',  'Bàn 4'),
  (5,  '5',  'Bàn 5'),
  (6,  '6',  'Bàn 6'),
  (7,  '7',  'Bàn 7'),
  (8,  '8',  'Bàn 8'),
  (9,  '9',  'Bàn 9'),
  (10, '10', 'Bàn 10');

ALTER TABLE tables AUTO_INCREMENT = 11;

-- Kiểm tra nhanh (sau khi chạy menu_seed.sql sẽ có dữ liệu menu)
SHOW TABLES;
