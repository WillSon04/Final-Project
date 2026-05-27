const express = require("express");
const pool = require("../db");
const { buildTableBill, getGuestCheckoutStatus } = require("../services/tableBill");

const router = express.Router();

// GET /api/tables
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, code, name FROM tables ORDER BY id ASC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "DB_ERROR", detail: err.message });
  }
});

// GET /api/tables/by-code/T01
router.get("/by-code/:code", async (req, res) => {
  try {
    const code = (req.params.code || "").toString().trim();

    const [[row]] = await pool.query(
      "SELECT id, code, name FROM tables WHERE code = ?",
      [code]
    );

    if (row) {
      return res.json(row);
    }

    const numericCode = Number(code);
    if (numericCode) {
      const [[rowById]] = await pool.query(
        "SELECT id, code, name FROM tables WHERE id = ?",
        [numericCode]
      );
      if (rowById) return res.json(rowById);
    }

    return res.status(404).json({ error: "TABLE_NOT_FOUND" });

  } catch (err) {
    res.status(500).json({ error: "DB_ERROR", detail: err.message });
  }
});

/**
 * POST /api/tables/:tableId/payment-request
 * Khách gọi nhân viên thanh toán (gộp bill cả bàn).
 */
router.post("/:tableId/payment-request", async (req, res) => {
  const tableId = Number(req.params.tableId);
  if (!tableId) {
    return res.status(400).json({ error: "INVALID_TABLE_ID" });
  }

  try {
    const [[table]] = await pool.query(
      "SELECT id FROM tables WHERE id = ?",
      [tableId]
    );
    if (!table) {
      return res.status(404).json({ error: "TABLE_NOT_FOUND" });
    }

    const bill = await buildTableBill(tableId);
    if (!bill.order_ids.length || bill.grand_total <= 0) {
      return res.status(400).json({ error: "NO_ORDERS_TO_PAY" });
    }
    if (!bill.can_pay) {
      return res.status(400).json({
        error: "ORDERS_STILL_IN_KITCHEN",
        pending_kitchen_count: bill.pending_kitchen_count,
      });
    }

    await pool.query(
      `INSERT INTO table_payment_requests (table_id, status, requested_at)
       VALUES (?, 'PENDING', NOW())
       ON DUPLICATE KEY UPDATE status = 'PENDING', requested_at = NOW()`,
      [tableId]
    );

    res.status(201).json({
      ok: true,
      table_id: tableId,
      payment_requested: true,
      grand_total: bill.grand_total,
      order_count: bill.order_ids.length,
    });
  } catch (err) {
    res.status(500).json({ error: "DB_ERROR", detail: err.message });
  }
});

/**
 * POST /api/tables/:tableId/ratings
 * body: { stars: 1-5, comment?: string }
 */
router.post("/:tableId/ratings", async (req, res) => {
  const tableId = Number(req.params.tableId);
  const stars = Number(req.body.stars);
  const comment = (req.body.comment || "").toString().trim().slice(0, 500);

  if (!tableId) {
    return res.status(400).json({ error: "INVALID_TABLE_ID" });
  }
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ error: "INVALID_RATING" });
  }

  try {
    const [[table]] = await pool.query(
      "SELECT id FROM tables WHERE id = ?",
      [tableId]
    );
    if (!table) {
      return res.status(404).json({ error: "TABLE_NOT_FOUND" });
    }

    const [result] = await pool.query(
      `INSERT INTO service_ratings (table_id, stars, comment) VALUES (?, ?, ?)`,
      [tableId, stars, comment || null]
    );

    await pool.query("DELETE FROM table_payment_requests WHERE table_id = ?", [
      tableId,
    ]);

    res.status(201).json({
      ok: true,
      rating_id: result.insertId,
      table_id: tableId,
      stars,
    });
  } catch (err) {
    res.status(500).json({ error: "DB_ERROR", detail: err.message });
  }
});

/**
 * DELETE /api/tables/:tableId/payment-request
 * Khách hủy khi bấm nhầm — tiếp tục gọi món.
 */
router.delete("/:tableId/payment-request", async (req, res) => {
  const tableId = Number(req.params.tableId);
  if (!tableId) {
    return res.status(400).json({ error: "INVALID_TABLE_ID" });
  }

  try {
    const [result] = await pool.query(
      `DELETE FROM table_payment_requests
       WHERE table_id = ? AND status = 'PENDING'`,
      [tableId]
    );
    res.json({
      ok: true,
      table_id: tableId,
      cancelled: result.affectedRows > 0,
    });
  } catch (err) {
    res.status(500).json({ error: "DB_ERROR", detail: err.message });
  }
});

/**
 * GET /api/tables/:tableId/checkout-status
 * Thu ngân đã thu tiền → khách được xác nhận và sang trang cảm ơn.
 */
router.get("/:tableId/checkout-status", async (req, res) => {
  const tableId = Number(req.params.tableId);
  if (!tableId) {
    return res.status(400).json({ error: "INVALID_TABLE_ID" });
  }

  try {
    const status = await getGuestCheckoutStatus(tableId);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: "DB_ERROR", detail: err.message });
  }
});

/**
 * GET /api/tables/:tableId/payment-request
 */
router.get("/:tableId/payment-request", async (req, res) => {
  const tableId = Number(req.params.tableId);
  if (!tableId) {
    return res.status(400).json({ error: "INVALID_TABLE_ID" });
  }

  try {
    const [[row]] = await pool.query(
      `SELECT table_id, status, requested_at
       FROM table_payment_requests
       WHERE table_id = ? AND status = 'PENDING'`,
      [tableId]
    );
    const bill = await buildTableBill(tableId);
    const hasBill = bill.order_ids.length > 0 && bill.grand_total > 0;
    res.json({
      table_id: tableId,
      payment_requested: Boolean(row),
      requested_at: row?.requested_at || null,
      can_request_payment: hasBill && bill.can_pay,
      pending_kitchen_count: bill.pending_kitchen_count,
    });
  } catch (err) {
    res.status(500).json({ error: "DB_ERROR", detail: err.message });
  }
});

module.exports = router;