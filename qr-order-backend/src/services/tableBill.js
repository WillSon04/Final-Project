const pool = require("../db");

const UNPAID_STATUSES = ["RECEIVED", "PREPARING", "COMPLETED"];

async function getUnpaidOrders(tableId, conn = pool) {
  const placeholders = UNPAID_STATUSES.map(() => "?").join(", ");
  const [rows] = await conn.query(
    `SELECT id, status, total, vat, grand_total, created_at
     FROM orders
     WHERE table_id = ?
       AND status IN (${placeholders})
     ORDER BY id ASC`,
    [tableId, ...UNPAID_STATUSES]
  );
  return rows;
}

async function getPaymentRequest(tableId, conn = pool) {
  const [[row]] = await conn.query(
    `SELECT table_id, status, requested_at
     FROM table_payment_requests
     WHERE table_id = ? AND status = 'PENDING'
     LIMIT 1`,
    [tableId]
  );
  return row || null;
}

async function buildTableBill(tableId, conn = pool) {
  const orders = await getUnpaidOrders(tableId, conn);
  if (!orders.length) {
    return {
      table_id: tableId,
      order_ids: [],
      orders: [],
      items: [],
      subtotal: 0,
      vat: 0,
      grand_total: 0,
      payment_requested: false,
      payment_requested_at: null,
      can_pay: false,
      pending_kitchen_count: 0,
    };
  }

  const orderIds = orders.map((o) => o.id);
  const ph = orderIds.map(() => "?").join(", ");

  const [items] = await conn.query(
    `SELECT
      oi.menu_item_id,
      mi.name,
      oi.unit_price,
      SUM(oi.quantity) AS quantity,
      SUM(oi.line_total) AS line_total
    FROM order_items oi
    JOIN menu_items mi ON mi.id = oi.menu_item_id
    WHERE oi.order_id IN (${ph})
    GROUP BY oi.menu_item_id, oi.unit_price, mi.name
    ORDER BY mi.name ASC`,
    orderIds
  );

  const subtotal = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const vat = orders.reduce((s, o) => s + Number(o.vat || 0), 0);
  const grandTotal = orders.reduce((s, o) => s + Number(o.grand_total || 0), 0);

  const pendingKitchen = orders.filter((o) =>
    ["RECEIVED", "PREPARING"].includes((o.status || "").toUpperCase())
  );

  const paymentReq = await getPaymentRequest(tableId, conn);

  return {
    table_id: tableId,
    order_ids: orderIds,
    orders: orders.map((o) => ({
      order_id: o.id,
      status: o.status,
      total: Number(o.total),
      vat: Number(o.vat),
      grand_total: Number(o.grand_total),
      created_at: o.created_at,
    })),
    items: items.map((row) => ({
      menu_item_id: row.menu_item_id,
      name: row.name,
      unit_price: Number(row.unit_price),
      quantity: Number(row.quantity),
      line_total: Number(row.line_total),
    })),
    subtotal,
    vat,
    grand_total: grandTotal,
    payment_requested: Boolean(paymentReq),
    payment_requested_at: paymentReq?.requested_at || null,
    can_pay: pendingKitchen.length === 0 && grandTotal > 0,
    pending_kitchen_count: pendingKitchen.length,
  };
}

/**
 * Khách có thể bấm「Đã thanh toán xong」khi bàn không còn đơn mở
 * và lượt vừa rồi đã có ít nhất một đơn PAID (thu ngân đã thu).
 */
async function getGuestCheckoutStatus(tableId, conn = pool) {
  const [[openRow]] = await conn.query(
    `SELECT COUNT(*) AS cnt
     FROM orders
     WHERE table_id = ?
       AND status IN ('RECEIVED', 'PREPARING', 'COMPLETED')`,
    [tableId]
  );
  const hasOpenOrders = Number(openRow.cnt) > 0;

  if (hasOpenOrders) {
    const paymentReq = await getPaymentRequest(tableId, conn);
    return {
      table_id: tableId,
      ready_for_guest_confirm: false,
      has_open_orders: true,
      paid_order_count: 0,
      payment_requested: Boolean(paymentReq),
    };
  }

  const [[maxRow]] = await conn.query(
    `SELECT COALESCE(MAX(id), 0) AS max_id FROM orders WHERE table_id = ?`,
    [tableId]
  );
  const maxId = Number(maxRow.max_id || 0);

  if (maxId === 0) {
    return {
      table_id: tableId,
      ready_for_guest_confirm: false,
      has_open_orders: false,
      paid_order_count: 0,
      payment_requested: false,
    };
  }

  const [[stats]] = await conn.query(
    `SELECT
       SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) AS paid_cnt,
       SUM(CASE WHEN status <> 'PAID' THEN 1 ELSE 0 END) AS unpaid_cnt
     FROM orders
     WHERE table_id = ? AND id <= ?`,
    [tableId, maxId]
  );

  const paidCount = Number(stats?.paid_cnt || 0);
  const unpaidCount = Number(stats?.unpaid_cnt || 0);
  const paymentReq = await getPaymentRequest(tableId, conn);

  return {
    table_id: tableId,
    ready_for_guest_confirm: unpaidCount === 0 && paidCount > 0,
    has_open_orders: false,
    paid_order_count: paidCount,
    payment_requested: Boolean(paymentReq),
  };
}

async function getTablesOverview(conn = pool) {
  const [tables] = await conn.query(
    "SELECT id, code, name FROM tables ORDER BY id ASC"
  );

  const overview = [];
  for (const t of tables) {
    const bill = await buildTableBill(t.id, conn);
    overview.push({
      table_id: t.id,
      code: t.code,
      name: t.name,
      payment_requested: bill.payment_requested,
      payment_requested_at: bill.payment_requested_at,
      unpaid_order_count: bill.order_ids.length,
      grand_total: bill.grand_total,
      can_pay: bill.can_pay,
      pending_kitchen_count: bill.pending_kitchen_count,
      has_bill: bill.order_ids.length > 0,
    });
  }
  return overview;
}

module.exports = {
  UNPAID_STATUSES,
  getUnpaidOrders,
  getPaymentRequest,
  buildTableBill,
  getGuestCheckoutStatus,
  getTablesOverview,
};
