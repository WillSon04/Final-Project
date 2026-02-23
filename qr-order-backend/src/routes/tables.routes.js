const express = require("express");
const pool = require("../db");

const router = express.Router();

// GET /api/tables/by-code/T01
router.get("/by-code/:code", async (req, res) => {
  try {
    const code = req.params.code;

    const [[row]] = await pool.query(
      "SELECT id, code, name FROM tables WHERE code = ?",
      [code]
    );

    if (!row) return res.status(404).json({ error: "TABLE_NOT_FOUND" });

    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "DB_ERROR", detail: err.message });
  }
});

module.exports = router;