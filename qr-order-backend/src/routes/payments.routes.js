const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * POST /api/payments
 * body: { order_id: number, method: "CASH"|"CARD" }
 */
router.post("/", async (req, res) => {
  const orderId = Number(req.body.order_id);
  const method = (req.body.method || "").toString().toUpperCase();

  if (!orderId) return res.status(400).json({ error: "INVALID_ORDER_ID" });
  if (!["CASH", "CARD"].includes(method)) return res.status(400).json({ error: "INVALID_METHOD" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[order]] = await conn.query(
      "SELECT id, grand_total, status FROM orders WHERE id = ?",
      [orderId]
    );
    if (!order) {
      await conn.rollback();
      return res.status(404).json({ error: "ORDER_NOT_FOUND" });
    }

    const amount = Number(order.grand_total ?? 0);
    if (amount <= 0) {
      await conn.rollback();
      return res.status(400).json({ error: "ORDER_TOTAL_INVALID" });
    }

    // tránh thanh toán 2 lần
    const [[existing]] = await conn.query(
      "SELECT id FROM payments WHERE order_id = ? AND status = 'PAID' LIMIT 1",
      [orderId]
    );
    if (existing) {
      await conn.rollback();
      return res.status(400).json({ error: "ORDER_ALREADY_PAID" });
    }

    const [payRes] = await conn.query(
      "INSERT INTO payments(order_id, method, amount, status) VALUES (?, ?, ?, 'PAID')",
      [orderId, method, amount]
    );

    await conn.commit();
    res.status(201).json({
      ok: true,
      payment_id: payRes.insertId,
      order_id: orderId,
      method,
      amount,
      status: "PAID",
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: "SERVER_ERROR", detail: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;