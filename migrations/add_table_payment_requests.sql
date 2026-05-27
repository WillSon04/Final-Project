-- Chạy file này nếu DB đã tạo từ schema cũ (chưa có table_payment_requests)
USE restaurant_qr;

CREATE TABLE IF NOT EXISTS table_payment_requests (
  table_id INT UNSIGNED NOT NULL,
  status ENUM('PENDING', 'PAID') NOT NULL DEFAULT 'PENDING',
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (table_id),
  CONSTRAINT fk_payment_req_table
    FOREIGN KEY (table_id) REFERENCES tables (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
