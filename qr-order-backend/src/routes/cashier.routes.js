const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * GET /api/cashier/orders?status=COMPLETED&paid=0|1
 * - paid=0: chưa thanh toán
 * - paid=1: đã thanh toán
 */
router.get("/orders", async (req, res) => {
  try {
    const status = (req.query.status || "COMPLETED").toString().toUpperCase();
    const paid = (req.query.paid ?? "0").toString(); // "0" hoặc "1"

    // paid=1 => có payment PAID
    // paid=0 => không có payment PAID
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