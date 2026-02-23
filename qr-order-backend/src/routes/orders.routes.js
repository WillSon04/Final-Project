const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * POST /api/orders
 * body: { table_id: number }
 * -> tạo order mới (RECEIVED)
 */
router.post("/", async (req, res) => {
  try {
    const tableId = Number(req.body.table_id);
    if (!tableId) return res.status(400).json({ error: "INVALID_TABLE_ID" });

    // kiểm tra bàn tồn tại
    const [[table]] = await pool.query("SELECT id FROM tables WHERE id = ?", [tableId]);
    if (!table) return res.status(404).json({ error: "TABLE_NOT_FOUND" });

    const [result] = await pool.query(
      "INSERT INTO orders(table_id, status, total, vat, grand_total) VALUES (?, 'RECEIVED', 0, 0, 0)",
      [tableId]
    );

    res.status(201).json({ order_id: result.insertId, status: "RECEIVED" });
  } catch (err) {
    res.status(500).json({ error: "SERVER_ERROR", detail: err.message });
  }
});

/**
 * POST /api/orders/:id/items
 * body: { menu_item_id: number, quantity: number, note?: string }
 * -> thêm 1 món vào order (tự lấy giá từ menu_items)
 */
router.post("/:id/items", async (req, res) => {
  const orderId = Number(req.params.id);
  const menuItemId = Number(req.body.menu_item_id);
  const qty = Number(req.body.quantity);
  const note = (req.body.note || "").toString();

  if (!orderId) return res.status(400).json({ error: "INVALID_ORDER_ID" });
  if (!menuItemId || !qty || qty <= 0) return res.status(400).json({ error: "INVALID_ITEM" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // kiểm tra order tồn tại + chưa completed
    const [[order]] = await conn.query("SELECT id, status FROM orders WHERE id = ?", [orderId]);
    if (!order) {
      await conn.rollback();
      return res.status(404).json({ error: "ORDER_NOT_FOUND" });
    }
    if (order.status === "COMPLETED") {
      await conn.rollback();
      return res.status(400).json({ error: "ORDER_ALREADY_COMPLETED" });
    }

    // lấy món + giá
    const [[menu]] = await conn.query(
      "SELECT id, price, is_available FROM menu_items WHERE id = ?",
      [menuItemId]
    );
    if (!menu) {
      await conn.rollback();
      return res.status(404).json({ error: "MENU_ITEM_NOT_FOUND", menu_item_id: menuItemId });
    }
    if (!menu.is_available) {
      await conn.rollback();
      return res.status(400).json({ error: "ITEM_NOT_AVAILABLE", menu_item_id: menuItemId });
    }

    const unitPrice = Number(menu.price);
    const lineTotal = unitPrice * qty;

    // thêm dòng vào order_items
    await conn.query(
      `INSERT INTO order_items(order_id, menu_item_id, quantity, note, unit_price, line_total)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, menuItemId, qty, note, unitPrice, lineTotal]
    );

    // tính lại tổng
    const [[sumRow]] = await conn.query(
      "SELECT COALESCE(SUM(line_total),0) AS total FROM order_items WHERE order_id = ?",
      [orderId]
    );

    const total = Number(sumRow.total);

    // VAT: bạn có thể đổi thành 0.1 (10%) nếu muốn
    const vatRate = 0;
    const vat = Math.round(total * vatRate * 100) / 100;
    const grand = total + vat;

    await conn.query(
      "UPDATE orders SET total=?, vat=?, grand_total=? WHERE id=?",
      [total, vat, grand, orderId]
    );

    await conn.commit();
    res.status(201).json({
      ok: true,
      order_id: orderId,
      added: { menu_item_id: menuItemId, quantity: qty, unit_price: unitPrice, line_total: lineTotal },
      total,
      vat,
      grand_total: grand,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: "SERVER_ERROR", detail: err.message });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/orders/:id
 * -> lấy order + items (phục vụ màn hình khách theo dõi)
 */
router.get("/:id", async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    if (!orderId) return res.status(400).json({ error: "INVALID_ORDER_ID" });

    const [[order]] = await pool.query("SELECT * FROM orders WHERE id = ?", [orderId]);
    if (!order) return res.status(404).json({ error: "ORDER_NOT_FOUND" });

    const [items] = await pool.query(
      `SELECT 
         oi.id,
         oi.menu_item_id,
         mi.name,
         oi.quantity,
         oi.note,
         oi.unit_price,
         oi.line_total
       FROM order_items oi
       JOIN menu_items mi ON mi.id = oi.menu_item_id
       WHERE oi.order_id = ?
       ORDER BY oi.id ASC`,
      [orderId]
    );

    res.json({ order, items });
  } catch (err) {
    res.status(500).json({ error: "DB_ERROR", detail: err.message });
  }
});

/**
 * PATCH /api/orders/:id/status
 * body: { status: "RECEIVED" | "PREPARING" | "COMPLETED" }
 * -> bếp/nhân viên đổi trạng thái
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const status = (req.body.status || "").toString().toUpperCase();

    const allowed = new Set(["RECEIVED", "PREPARING", "COMPLETED"]);
    if (!orderId) return res.status(400).json({ error: "INVALID_ORDER_ID" });
    if (!allowed.has(status)) return res.status(400).json({ error: "INVALID_STATUS" });

    const [result] = await pool.query("UPDATE orders SET status=? WHERE id=?", [status, orderId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "ORDER_NOT_FOUND" });

    res.json({ ok: true, order_id: orderId, status });
  } catch (err) {
    res.status(500).json({ error: "DB_ERROR", detail: err.message });
  }
});

module.exports = router;
// GET /api/orders?status=RECEIVED|PREPARING|COMPLETED
router.get("/", async (req, res) => {
    try {
      const status = (req.query.status || "").toString().toUpperCase();
  
      let sql = `
        SELECT id, table_id, status, total, vat, grand_total, created_at, updated_at
        FROM orders
      `;
      const params = [];
  
      if (status) {
        sql += " WHERE status = ?";
        params.push(status);
      }
  
      sql += " ORDER BY created_at DESC";
  
      const [rows] = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "DB_ERROR", detail: err.message });
    }
  });
// GET /api/orders?status=RECEIVED|PREPARING|COMPLETED
router.get("/", async (req, res) => {
    try {
      const status = (req.query.status || "").toString().toUpperCase();
  
      let sql = `SELECT id, table_id, status, total, vat, grand_total, created_at, updated_at
                 FROM orders`;
      const params = [];
  
      if (status) {
        sql += " WHERE status = ?";
        params.push(status);
      }
  
      sql += " ORDER BY created_at DESC";
  
      const [rows] = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "DB_ERROR", detail: err.message });
    }
  });