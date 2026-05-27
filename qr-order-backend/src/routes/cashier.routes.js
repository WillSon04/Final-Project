const express = require("express");
const pool = require("../db");
const {
  buildTableBill,
  getTablesOverview,
  getUnpaidOrders,
} = require("../services/tableBill");

const router = express.Router();

/**
 * GET /api/cashier/tables
 * Tổng quan 10 bàn: yêu cầu thanh toán, tổng tiền chưa trả.
 */
router.get("/tables", async (_req, res) => {
  try {
    const overview = await getTablesOverview();
    res.json(overview);
  } catch (err) {
    res.status(500).json({ error: "DB_ERROR", detail: err.message });
  }
});

/**
 * GET /api/cashier/tables/:tableId/bill
 * Hóa đơn gộp tất cả đơn chưa thanh toán của bàn.
 */
router.get("/tables/:tableId/bill", async (req, res) => {
  try {
    const tableId = Number(req.params.tableId);
    if (!tableId) {
      return res.status(400).json({ error: "INVALID_TABLE_ID" });
    }

    const [[table]] = await pool.query(
      "SELECT id, code, name FROM tables WHERE id = ?",
      [tableId]
    );
    if (!table) {
      return res.status(404).json({ error: "TABLE_NOT_FOUND" });
    }

    const bill = await buildTableBill(tableId);
    res.json({ table, ...bill });
  } catch (err) {
    res.status(500).json({ error: "DB_ERROR", detail: err.message });
  }
});

/**
 * POST /api/cashier/tables/:tableId/pay
 * Thanh toán một lần cho toàn bộ đơn chưa trả của bàn.
 * body: { method: "CASH"|"CARD" }
 */
router.post("/tables/:tableId/pay", async (req, res) => {
  const tableId = Number(req.params.tableId);
  const method = (req.body.method || "").toString().toUpperCase();

  if (!tableId) {
    return res.status(400).json({ error: "INVALID_TABLE_ID" });
  }
  if (!["CASH", "CARD"].includes(method)) {
    return res.status(400).json({ error: "INVALID_METHOD" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const bill = await buildTableBill(tableId, conn);
    if (!bill.order_ids.length) {
      await conn.rollback();
      return res.status(400).json({ error: "NO_ORDERS_TO_PAY" });
    }
    if (!bill.can_pay) {
      await conn.rollback();
      return res.status(400).json({
        error: "ORDERS_STILL_IN_KITCHEN",
        pending_kitchen_count: bill.pending_kitchen_count,
      });
    }
    if (bill.grand_total <= 0) {
      await conn.rollback();
      return res.status(400).json({ error: "ORDER_TOTAL_INVALID" });
    }

    const payments = [];
    for (const order of bill.orders) {
      if ((order.status || "").toUpperCase() !== "COMPLETED") {
        continue;
      }

      const [[existing]] = await conn.query(
        "SELECT id FROM payments WHERE order_id = ? AND status = 'PAID' LIMIT 1",
        [order.order_id]
      );
      if (existing) continue;

      const amount = Number(order.grand_total || 0);
      const [payRes] = await conn.query(
        "INSERT INTO payments(order_id, method, amount, status) VALUES (?, ?, ?, 'PAID')",
        [order.order_id, method, amount]
      );
      await conn.query("UPDATE orders SET status = 'PAID' WHERE id = ?", [
        order.order_id,
      ]);
      payments.push({
        payment_id: payRes.insertId,
        order_id: order.order_id,
        amount,
      });
    }

    if (!payments.length) {
      await conn.rollback();
      return res.status(400).json({ error: "NO_ORDERS_TO_PAY" });
    }

    await conn.query(
      "UPDATE table_payment_requests SET status = 'PAID' WHERE table_id = ?",
      [tableId]
    );

    await conn.commit();
    res.status(201).json({
      ok: true,
      table_id: tableId,
      method,
      amount: bill.grand_total,
      order_ids: payments.map((p) => p.order_id),
      payments,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: "SERVER_ERROR", detail: err.message });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/cashier/orders?status=COMPLETED&paid=0|1
 * (Giữ tương thích cũ — danh sách theo đơn lẻ)
 */
router.get("/orders", async (req, res) => {
  try {
    const status = (req.query.status || "COMPLETED").toString().toUpperCase();
    const paid = (req.query.paid ?? "0").toString();

    const sql = `
      SELECT 
        o.id, o.table_id, o.status, o.total, o.vat, o.grand_total, o.created_at, o.updated_at,
        p.id AS payment_id, p.method AS payment_method, p.amount AS payment_amount, p.paid_at
      FROM orders o
      LEFT JOIN payments p 
        ON p.order_id = o.id AND p.status = 'PAID'
      WHERE o.status = ?
        AND ${paid === "1" ? "p.id IS NOT NULL" : "p.id IS NULL"}
      ORDER BY o.created_at DESC
    `;

    const [rows] = await pool.query(sql, [status]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "DB_ERROR", detail: err.message });
  }
});

module.exports = router;
