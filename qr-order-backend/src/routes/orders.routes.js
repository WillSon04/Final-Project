const express = require("express");
const pool = require("../db");

const router = express.Router();
const ORDER_STATUSES = ["RECEIVED", "PREPARING", "COMPLETED", "PAID"];
const STATUS_TRANSITIONS = {
  RECEIVED: new Set(["PREPARING"]),
  PREPARING: new Set(["COMPLETED"]),
  COMPLETED: new Set(["PAID"]),
  PAID: new Set(),
};

async function resolveTable(conn, { tableId, tableCode }) {
  if (tableId) {
    const [[tableById]] = await conn.query(
      "SELECT id, code, name FROM tables WHERE id = ?",
      [tableId]
    );
    if (tableById) return tableById;
  }

  if (tableCode) {
    const normalized = tableCode.toString().trim();
    if (!normalized) return null;

    const [[tableByCode]] = await conn.query(
      "SELECT id, code, name FROM tables WHERE code = ? LIMIT 1",
      [normalized]
    );
    if (tableByCode) return tableByCode;

    const numericCode = Number(normalized);
    if (numericCode) {
      const [[tableByNumericId]] = await conn.query(
        "SELECT id, code, name FROM tables WHERE id = ? LIMIT 1",
        [numericCode]
      );
      if (tableByNumericId) return tableByNumericId;
    }
  }

  return null;
}

async function recalculateOrderTotals(conn, orderId) {
  const [[sumRow]] = await conn.query(
    `SELECT COALESCE(SUM(line_total), 0) AS total
     FROM order_items
     WHERE order_id = ?`,
    [orderId]
  );

  const total = Number(sumRow.total || 0);
  const vatRate = 0.08;
  const vat = Math.round(total * vatRate * 100) / 100;
  const grandTotal = total + vat;

  await conn.query(
    `UPDATE orders
     SET total = ?, vat = ?, grand_total = ?
     WHERE id = ?`,
    [total, vat, grandTotal, orderId]
  );

  return { total, vat, grandTotal };
}

/**
 * POST /api/orders
 * body: { table_id: number }
 * -> create new order (RECEIVED)
 */
router.post("/", async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const tableId = Number(req.body.table_id);
    const tableCode = (req.body.table_code || "").toString().trim();

    if (!tableId && !tableCode) {
      return res.status(400).json({ error: "INVALID_TABLE_REFERENCE" });
    }

    const table = await resolveTable(conn, { tableId, tableCode });

    if (!table) {
      return res.status(404).json({ error: "TABLE_NOT_FOUND" });
    }

    const [result] = await conn.query(
      `INSERT INTO orders
       (table_id, status, total, vat, grand_total)
       VALUES (?, 'RECEIVED', 0, 0, 0)`,
      [table.id]
    );

    return res.status(201).json({
      order_id: result.insertId,
      table_id: table.id,
      table_code: table.code,
      status: "RECEIVED",
    });
  } catch (err) {
    return res.status(500).json({
      error: "SERVER_ERROR",
      detail: err.message,
    });
  } finally {
    conn.release();
  }
});

/**
 * POST /api/orders/tables/:tableCode/order-items
 * body: { menu_item_id, quantity, note? }
 * IMPORTANT:
 * Route này phải nằm TRƯỚC /:id/items
 */
router.post("/tables/:tableCode/order-items", async (req, res) => {
  const tableCode = (req.params.tableCode || "").toString().trim();
  const menuItemId = Number(req.body.menu_item_id);
  const qty = Number(req.body.quantity);
  const note = (req.body.note || "").toString();

  if (!tableCode) {
    return res.status(400).json({ error: "INVALID_TABLE_CODE" });
  }

  if (!menuItemId || !qty || qty <= 0) {
    return res.status(400).json({ error: "INVALID_ITEM" });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // find table by code
    const table = await resolveTable(conn, { tableCode });

    if (!table) {
      await conn.rollback();
      return res.status(404).json({ error: "TABLE_NOT_FOUND" });
    }

    // Chỉ gộp món vào đơn đang RECEIVED; PREPARING+ → lượt gọi mới
    const [[activeOrder]] = await conn.query(
      `SELECT id, status
       FROM orders
       WHERE table_id = ?
       AND status = 'RECEIVED'
       ORDER BY id DESC
       LIMIT 1`,
      [table.id]
    );

    let orderId;

    if (activeOrder) {
      orderId = activeOrder.id;
    } else {
      const [newOrderResult] = await conn.query(
        `INSERT INTO orders
         (table_id, status, total, vat, grand_total)
         VALUES (?, 'RECEIVED', 0, 0, 0)`,
        [table.id]
      );

      orderId = newOrderResult.insertId;
    }

    // get menu item
    const [[menu]] = await conn.query(
      "SELECT id, price, is_available FROM menu_items WHERE id = ?",
      [menuItemId]
    );

    if (!menu) {
      await conn.rollback();
      return res.status(404).json({ error: "MENU_ITEM_NOT_FOUND" });
    }

    if (!menu.is_available) {
      await conn.rollback();
      return res.status(400).json({ error: "ITEM_NOT_AVAILABLE" });
    }

    const unitPrice = Number(menu.price);
    const lineTotal = unitPrice * qty;

    // insert item
    await conn.query(
      `INSERT INTO order_items
       (order_id, menu_item_id, quantity, note, unit_price, line_total)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, menuItemId, qty, note, unitPrice, lineTotal]
    );

    const { total, vat, grandTotal } = await recalculateOrderTotals(conn, orderId);

    await conn.commit();

    return res.status(201).json({
      ok: true,
      table_code: tableCode,
      order_id: orderId,
      total,
      vat,
      grand_total: grandTotal,
    });
  } catch (err) {
    await conn.rollback();

    return res.status(500).json({
      error: "SERVER_ERROR",
      detail: err.message,
    });
  } finally {
    conn.release();
  }
});

/**
 * POST /api/orders/:id/items
 * body: { menu_item_id, quantity, note? }
 */
router.post("/:id/items", async (req, res) => {
  const orderId = Number(req.params.id);
  const menuItemId = Number(req.body.menu_item_id);
  const qty = Number(req.body.quantity);
  const note = (req.body.note || "").toString();

  if (!orderId) {
    return res.status(400).json({ error: "INVALID_ORDER_ID" });
  }

  if (!menuItemId || !qty || qty <= 0) {
    return res.status(400).json({ error: "INVALID_ITEM" });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[order]] = await conn.query(
      "SELECT id, status FROM orders WHERE id = ?",
      [orderId]
    );

    if (!order) {
      await conn.rollback();
      return res.status(404).json({ error: "ORDER_NOT_FOUND" });
    }

    const orderStatus = (order.status || "").toString().toUpperCase();
    if (orderStatus === "PAID" || orderStatus === "COMPLETED") {
      await conn.rollback();
      return res.status(400).json({ error: "ORDER_CLOSED" });
    }
    if (orderStatus === "PREPARING") {
      await conn.rollback();
      return res.status(400).json({ error: "ORDER_IN_KITCHEN" });
    }

    const [[menu]] = await conn.query(
      "SELECT id, price, is_available FROM menu_items WHERE id = ?",
      [menuItemId]
    );

    if (!menu) {
      await conn.rollback();
      return res.status(404).json({ error: "MENU_ITEM_NOT_FOUND" });
    }

    if (!menu.is_available) {
      await conn.rollback();
      return res.status(400).json({ error: "ITEM_NOT_AVAILABLE" });
    }

    const unitPrice = Number(menu.price);
    const lineTotal = unitPrice * qty;

    await conn.query(
      `INSERT INTO order_items
       (order_id, menu_item_id, quantity, note, unit_price, line_total)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, menuItemId, qty, note, unitPrice, lineTotal]
    );

    const { total, vat, grandTotal } = await recalculateOrderTotals(conn, orderId);

    await conn.commit();

    return res.status(201).json({
      ok: true,
      order_id: orderId,
      total,
      vat,
      grand_total: grandTotal,
    });
  } catch (err) {
    await conn.rollback();

    return res.status(500).json({
      error: "SERVER_ERROR",
      detail: err.message,
    });
  } finally {
    conn.release();
  }
});

/**
 * DELETE /api/orders/:id/items
 * body: { menu_item_id, quantity? }
 */
router.delete("/:id/items", async (req, res) => {
  const orderId = Number(req.params.id);
  const menuItemId = Number(req.body.menu_item_id);
  const qty = Number(req.body.quantity || 1);

  if (!orderId) {
    return res.status(400).json({ error: "INVALID_ORDER_ID" });
  }

  if (!menuItemId || !qty || qty <= 0) {
    return res.status(400).json({ error: "INVALID_ITEM" });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[order]] = await conn.query(
      "SELECT id, status FROM orders WHERE id = ?",
      [orderId]
    );

    if (!order) {
      await conn.rollback();
      return res.status(404).json({ error: "ORDER_NOT_FOUND" });
    }

    if (order.status === "COMPLETED" || order.status === "PAID") {
      await conn.rollback();
      return res.status(400).json({ error: "ORDER_CLOSED" });
    }

    const [itemRows] = await conn.query(
      `SELECT id, quantity, unit_price
       FROM order_items
       WHERE order_id = ? AND menu_item_id = ?
       ORDER BY id DESC`,
      [orderId, menuItemId]
    );

    if (!itemRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: "ITEM_NOT_FOUND_IN_ORDER" });
    }

    let remaining = qty;

    for (const row of itemRows) {
      if (remaining <= 0) break;

      const rowQty = Number(row.quantity);
      const unitPrice = Number(row.unit_price);

      if (rowQty <= remaining) {
        await conn.query("DELETE FROM order_items WHERE id = ?", [row.id]);
        remaining -= rowQty;
      } else {
        const nextQty = rowQty - remaining;
        const nextLineTotal = unitPrice * nextQty;

        await conn.query(
          "UPDATE order_items SET quantity = ?, line_total = ? WHERE id = ?",
          [nextQty, nextLineTotal, row.id]
        );
        remaining = 0;
      }
    }

    if (remaining > 0) {
      await conn.rollback();
      return res.status(400).json({ error: "INSUFFICIENT_QUANTITY" });
    }

    const { total, vat, grandTotal } = await recalculateOrderTotals(conn, orderId);

    await conn.commit();

    return res.json({
      ok: true,
      order_id: orderId,
      total,
      vat,
      grand_total: grandTotal,
    });
  } catch (err) {
    await conn.rollback();

    return res.status(500).json({
      error: "SERVER_ERROR",
      detail: err.message,
    });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/orders/table/:tableId/active
 * -> đơn còn nhận thêm món: chỉ RECEIVED (bếp đã "Bắt đầu chế biến" → đơn mới).
 */
router.get("/table/:tableId/active", async (req, res) => {
  try {
    const tableId = Number(req.params.tableId);

    if (!tableId) {
      return res.status(400).json({ error: "INVALID_TABLE_ID" });
    }

    const [[row]] = await pool.query(
      `SELECT id, status, grand_total, total
       FROM orders
       WHERE table_id = ?
       AND status = 'RECEIVED'
       ORDER BY id DESC
       LIMIT 1`,
      [tableId]
    );

    if (!row) {
      return res.status(404).json({ error: "NO_ACTIVE_ORDER" });
    }

    return res.json({
      order_id: row.id,
      status: row.status,
      grand_total: Number(row.grand_total || 0),
      total: Number(row.total || 0),
    });
  } catch (err) {
    return res.status(500).json({
      error: "DB_ERROR",
      detail: err.message,
    });
  }
});

/**
 * GET /api/orders/table/:tableId/history
 * -> order history for a table (guest-facing).
 *
 * If the table has NO open orders (RECEIVED / PREPARING / COMPLETED), every existing
 * order is settled → treat as a new seating: only return orders with id > MAX(id),
 * i.e. empty until the next customer creates new orders (khách sau không thấy lịch sử khách trước).
 * If there is at least one open order, return orders for the current sitting that are
 * still relevant for the guest (never PAID — đơn đã thanh toán không hiện trong lịch sử đặt món).
 */
router.get("/table/:tableId/history", async (req, res) => {
  try {
    const tableId = Number(req.params.tableId);

    if (!tableId) {
      return res.status(400).json({ error: "INVALID_TABLE_ID" });
    }

    const [[openRow]] = await pool.query(
      `SELECT COUNT(*) AS cnt
       FROM orders
       WHERE table_id = ?
       AND status IN ('RECEIVED', 'PREPARING', 'COMPLETED')`,
      [tableId]
    );

    const hasOpenOrders = Number(openRow.cnt) > 0;

    let minExclusiveOrderId = 0;
    if (!hasOpenOrders) {
      const [[maxRow]] = await pool.query(
        `SELECT COALESCE(MAX(id), 0) AS max_id FROM orders WHERE table_id = ?`,
        [tableId]
      );
      minExclusiveOrderId = Number(maxRow.max_id || 0);
    }

    let sql = `
      SELECT
        o.id AS order_id,
        o.status,
        o.created_at,
        oi.menu_item_id,
        mi.name AS menu_item_name,
        SUM(oi.quantity) AS quantity
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE o.table_id = ?
      AND o.status <> 'PAID'
    `;
    const params = [tableId];

    if (!hasOpenOrders && minExclusiveOrderId > 0) {
      sql += " AND o.id > ?";
      params.push(minExclusiveOrderId);
    }

    sql += `
      GROUP BY
        o.id,
        o.status,
        o.created_at,
        oi.menu_item_id,
        mi.name
      ORDER BY o.id ASC
    `;

    const [rows] = await pool.query(sql, params);

    const grouped = new Map();

    for (const row of rows) {
      const orderId = Number(row.order_id);

      if (!grouped.has(orderId)) {
        grouped.set(orderId, {
          order_id: orderId,
          status: row.status,
          created_at: row.created_at,
          items: [],
        });
      }

      if (row.menu_item_id) {
        grouped.get(orderId).items.push({
          menu_item_id: Number(row.menu_item_id),
          name: row.menu_item_name,
          quantity: Number(row.quantity || 0),
        });
      }
    }

    return res.json(Array.from(grouped.values()));
  } catch (err) {
    return res.status(500).json({
      error: "DB_ERROR",
      detail: err.message,
    });
  }
});

/**
 * GET /api/orders/table/:tableId/kitchen-history
 * Lịch sử đơn theo bàn cho dashboard bếp — không áp dụng logic “session khách” của /history.
 * Trả về các đơn gần nhất của bàn (mặc định 25), kèm nhóm món.
 */
router.get("/table/:tableId/kitchen-history", async (req, res) => {
  try {
    const tableId = Number(req.params.tableId);

    if (!tableId) {
      return res.status(400).json({ error: "INVALID_TABLE_ID" });
    }

    const limitOrders = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);

    const [idRows] = await pool.query(
      `SELECT id FROM orders WHERE table_id = ? ORDER BY id DESC LIMIT ?`,
      [tableId, limitOrders]
    );

    const ids = idRows.map((r) => Number(r.id));
    if (!ids.length) {
      return res.json([]);
    }

    const placeholders = ids.map(() => "?").join(",");
    const [rows] = await pool.query(
      `SELECT
        o.id AS order_id,
        o.status,
        o.created_at,
        oi.menu_item_id,
        mi.name AS menu_item_name,
        SUM(oi.quantity) AS quantity
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE o.id IN (${placeholders})
      GROUP BY
        o.id,
        o.status,
        o.created_at,
        oi.menu_item_id,
        mi.name
      ORDER BY o.id DESC`,
      ids
    );

    const grouped = new Map();

    for (const row of rows) {
      const orderId = Number(row.order_id);

      if (!grouped.has(orderId)) {
        grouped.set(orderId, {
          order_id: orderId,
          status: row.status,
          created_at: row.created_at,
          items: [],
        });
      }

      if (row.menu_item_id) {
        grouped.get(orderId).items.push({
          menu_item_id: Number(row.menu_item_id),
          name: row.menu_item_name,
          quantity: Number(row.quantity || 0),
        });
      }
    }

    const list = ids.map((oid) => grouped.get(oid)).filter(Boolean);
    return res.json(list);
  } catch (err) {
    return res.status(500).json({
      error: "DB_ERROR",
      detail: err.message,
    });
  }
});

/**
 * GET /api/orders/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const orderId = Number(req.params.id);

    if (!orderId) {
      return res.status(400).json({ error: "INVALID_ORDER_ID" });
    }

    const [[order]] = await pool.query(
      "SELECT * FROM orders WHERE id = ?",
      [orderId]
    );

    if (!order) {
      return res.status(404).json({ error: "ORDER_NOT_FOUND" });
    }

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

    return res.json({ order, items });
  } catch (err) {
    return res.status(500).json({
      error: "DB_ERROR",
      detail: err.message,
    });
  }
});

/**
 * PATCH /api/orders/:id/status
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const status = (req.body.status || "").toString().toUpperCase();

    if (!orderId) {
      return res.status(400).json({ error: "INVALID_ORDER_ID" });
    }

    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: "INVALID_STATUS" });
    }

    const [[order]] = await pool.query(
      "SELECT id, status, table_id FROM orders WHERE id = ?",
      [orderId]
    );

    if (!order) {
      return res.status(404).json({ error: "ORDER_NOT_FOUND" });
    }

    const currentStatus = (order.status || "").toString().toUpperCase();
    if (!ORDER_STATUSES.includes(currentStatus)) {
      return res.status(400).json({ error: "INVALID_CURRENT_STATUS" });
    }

    if (status !== currentStatus && !STATUS_TRANSITIONS[currentStatus].has(status)) {
      return res.status(400).json({
        error: "INVALID_STATUS_TRANSITION",
        from: currentStatus,
        to: status,
      });
    }

    // Cùng bàn: phải hoàn thành đơn cũ (id nhỏ hơn) trước khi bắt đầu chế biến đơn mới
    if (status === "PREPARING" && currentStatus === "RECEIVED") {
      const [[prior]] = await pool.query(
        `SELECT id FROM orders
         WHERE table_id = ?
           AND id < ?
           AND status IN ('RECEIVED', 'PREPARING')
         ORDER BY id ASC
         LIMIT 1`,
        [order.table_id, orderId]
      );
      if (prior) {
        return res.status(400).json({
          error: "PRIOR_ORDER_IN_PROGRESS",
          prior_order_id: prior.id,
        });
      }
    }

    const [result] = await pool.query(
      "UPDATE orders SET status = ? WHERE id = ?",
      [status, orderId]
    );

    return res.json({
      ok: true,
      order_id: orderId,
      previous_status: currentStatus,
      status,
      updated: result.affectedRows > 0,
    });
  } catch (err) {
    return res.status(500).json({
      error: "DB_ERROR",
      detail: err.message,
    });
  }
});

/**
 * GET /api/orders?status=
 */
router.get("/", async (req, res) => {
  try {
    const status = (req.query.status || "").toString().toUpperCase();

    let sql = `
      SELECT
        id,
        table_id,
        status,
        total,
        vat,
        grand_total,
        created_at,
        updated_at
      FROM orders
    `;

    const params = [];

    if (status) {
      sql += " WHERE status = ?";
      params.push(status);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.query(sql, params);

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({
      error: "DB_ERROR",
      detail: err.message,
    });
  }
});

module.exports = router;