const express = require("express");
const pool = require("../db");

const router = express.Router();

// GET /api/menu/categories
router.get("/categories", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name FROM categories ORDER BY id ASC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "DB_ERROR", detail: err.message });
  }
});

// GET /api/menu/items?category_id=&q=
router.get("/items", async (req, res) => {
  try {
    const { category_id, q } = req.query;

    let sql = `
      SELECT id, category_id, name, description, price, image_url, is_available
      FROM menu_items
      WHERE 1=1
    `;
    const params = [];

    if (category_id) {
      sql += " AND category_id = ?";
      params.push(Number(category_id));
    }
    if (q) {
      sql += " AND name LIKE ?";
      params.push(`%${q}%`);
    }

    sql += " ORDER BY id ASC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "DB_ERROR", detail: err.message });
  }
});

module.exports = router;