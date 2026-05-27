const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * GET /api/ratings
 * Danh sách đánh giá khách (mới nhất trước).
 */
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, table_id, stars, comment, created_at
       FROM service_ratings
       ORDER BY created_at DESC
       LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "DB_ERROR", detail: err.message });
  }
});

module.exports = router;
