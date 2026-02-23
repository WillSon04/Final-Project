import { useEffect, useMemo, useState } from "react";
import { api } from "/src/api";

function Money({ value }) {
  return <b>{Number(value ?? 0).toLocaleString()} đ</b>;
}

export default function Cashier() {
  const [unpaid, setUnpaid] = useState([]);
  const [paid, setPaid] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [err, setErr] = useState("");
  const [loadingPay, setLoadingPay] = useState(false);

  async function loadLists() {
    try {
      setErr("");
      const [r1, r2] = await Promise.all([
        api.get("/api/cashier/orders", { params: { status: "COMPLETED", paid: 0 } }),
        api.get("/api/cashier/orders", { params: { status: "COMPLETED", paid: 1 } }),
      ]);
      setUnpaid(r1.data);
      setPaid(r2.data);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  }

  async function loadDetail(orderId) {
    try {
      setErr("");
      const res = await api.get(`/api/orders/${orderId}`);
      setDetail(res.data);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  }

  async function pay(orderId, method) {
    try {
      setLoadingPay(true);
      setErr("");

      await api.post("/api/payments", {
        order_id: orderId,
        method, // "CASH" | "CARD"
      });

      await Promise.all([loadLists(), loadDetail(orderId)]);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoadingPay(false);
    }
  }

  useEffect(() => {
    let t;
    loadLists();
    t = setInterval(loadLists, 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (selected?.id) loadDetail(selected.id);
  }, [selected?.id]);

  const order = useMemo(() => detail?.order, [detail]);
  const items = useMemo(() => detail?.items || [], [detail]);

  return (
    <div style={{ padding: 16, fontFamily: "Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0 }}>Admin / Cashier</h2>
        <div style={{ color: "#666" }}>Auto refresh mỗi 3 giây</div>
      </div>

      {err ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "#fee2e2", color: "#991b1b" }}>
          Error: {err}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 16, marginTop: 16 }}>
        {/* UNPAID */}
        <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>UNPAID COMPLETED ({unpaid.length})</h3>

          {unpaid.length === 0 ? (
            <div style={{ color: "#666" }}>Không có đơn cần thanh toán.</div>
          ) : (
            unpaid.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelected(o)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: selected?.id === o.id ? "2px solid #111827" : "1px solid #eee",
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 10,
                  background: "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <b>Order #{o.id}</b>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>UNPAID</span>
                </div>
                <div style={{ marginTop: 6, color: "#374151" }}>Table ID: {o.table_id}</div>
                <div style={{ marginTop: 6 }}>
                  Total: <Money value={o.grand_total ?? o.total} />
                </div>
              </button>
            ))
          )}
        </div>

        {/* PAID HISTORY */}
        <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>PAID HISTORY ({paid.length})</h3>

          {paid.length === 0 ? (
            <div style={{ color: "#666" }}>Chưa có đơn thanh toán.</div>
          ) : (
            paid.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelected(o)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: selected?.id === o.id ? "2px solid #111827" : "1px solid #eee",
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 10,
                  background: "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <b>Order #{o.id}</b>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>
                    PAID ({o.payment_method})
                  </span>
                </div>
                <div style={{ marginTop: 6, color: "#374151" }}>Table ID: {o.table_id}</div>
                <div style={{ marginTop: 6 }}>
                  Amount: <Money value={o.payment_amount ?? o.grand_total ?? o.total} />
                </div>
              </button>
            ))
          )}
        </div>

        {/* DETAIL */}
        <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Order Detail</h3>

          {!order ? (
            <div style={{ color: "#666" }}>Chọn 1 order bên trái để xem chi tiết.</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>Order #{order.id}</div>
                  <div style={{ marginTop: 6 }}>Status: <b>{order.status}</b></div>
                  <div style={{ marginTop: 6 }}>Table ID: {order.table_id}</div>
                  <div style={{ marginTop: 6 }}>
                    Total: <Money value={order.grand_total ?? order.total} />
                  </div>
                </div>

                {/* Pay buttons chỉ hiện khi order đang nằm trong UNPAID list */}
                <div style={{ display: "grid", gap: 8 }}>
                  {unpaid.some((x) => x.id === order.id) ? (
                    <>
                      <button
                        disabled={loadingPay}
                        onClick={() => pay(order.id, "CASH")}
                        style={{ padding: "10px 12px", cursor: "pointer" }}
                      >
                        Pay CASH
                      </button>
                      <button
                        disabled={loadingPay}
                        onClick={() => pay(order.id, "CARD")}
                        style={{ padding: "10px 12px", cursor: "pointer" }}
                      >
                        Pay CARD
                      </button>
                    </>
                  ) : (
                    <div style={{ color: "#065f46", fontWeight: 800 }}>Đã thanh toán</div>
                  )}
                </div>
              </div>

              <h4 style={{ marginTop: 16, marginBottom: 8 }}>Items</h4>
              <div style={{ display: "grid", gap: 10 }}>
                {items.map((it) => (
                  <div key={it.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                    <div style={{ fontWeight: 800 }}>{it.name}</div>
                    <div>Qty: {it.quantity}</div>
                    {it.note ? <div>Note: {it.note}</div> : null}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}