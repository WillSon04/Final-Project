import { useEffect, useMemo, useState } from "react";
import { api } from "/src/api";

function StatusBadge({ status }) {
  const map = {
    RECEIVED: { bg: "#eef2ff", text: "#3730a3" },
    PREPARING: { bg: "#fff7ed", text: "#9a3412" },
    COMPLETED: { bg: "#ecfdf5", text: "#065f46" },
  };
  const s = map[status] || { bg: "#f3f4f6", text: "#111827" };

  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 999,
        background: s.bg,
        color: s.text,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {status}
    </span>
  );
}

export default function Kitchen() {
  const [received, setReceived] = useState([]);
  const [preparing, setPreparing] = useState([]);
  const [completed, setCompleted] = useState([]);

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [err, setErr] = useState("");

  async function loadLists() {
    try {
      setErr("");
      const [r1, r2, r3] = await Promise.all([
        api.get("/api/orders", { params: { status: "RECEIVED" } }),
        api.get("/api/orders", { params: { status: "PREPARING" } }),
        api.get("/api/orders", { params: { status: "COMPLETED" } }),
      ]);

      setReceived(r1.data);
      setPreparing(r2.data);
      setCompleted(r3.data);
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

  async function changeStatus(orderId, status) {
    try {
      setErr("");
      await api.patch(`/api/orders/${orderId}/status`, { status });
      await Promise.all([loadLists(), loadDetail(orderId)]);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  }

  useEffect(() => {
    let t;
    loadLists();
    t = setInterval(loadLists, 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (selectedOrderId) loadDetail(selectedOrderId);
  }, [selectedOrderId]);

  const selected = useMemo(() => detail?.order, [detail]);
  const items = useMemo(() => detail?.items || [], [detail]);

  return (
    <div style={{ padding: 16, fontFamily: "Arial" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <h2 style={{ margin: 0 }}>Admin / Kitchen</h2>
        <div style={{ color: "#666" }}>Auto refresh mỗi 3 giây</div>
      </div>

      {err ? (
        <div
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 8,
            background: "#fee2e2",
            color: "#991b1b",
          }}
        >
          Error: {err}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1.2fr",
          gap: 16,
          marginTop: 16,
        }}
      >
        {/* RECEIVED */}
        <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>RECEIVED ({received.length})</h3>

          {received.length === 0 ? (
            <div style={{ color: "#666" }}>Không có đơn mới.</div>
          ) : (
            received.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedOrderId(o.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: selectedOrderId === o.id ? "2px solid #111827" : "1px solid #eee",
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 10,
                  background: "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <b>Order #{o.id}</b>
                  <StatusBadge status={o.status} />
                </div>
                <div style={{ marginTop: 6, color: "#374151" }}>Table ID: {o.table_id}</div>
                <div style={{ marginTop: 6 }}>
                  Total: <b>{Number(o.grand_total ?? o.total ?? 0).toLocaleString()} đ</b>
                </div>
              </button>
            ))
          )}
        </div>

        {/* PREPARING */}
        <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>PREPARING ({preparing.length})</h3>

          {preparing.length === 0 ? (
            <div style={{ color: "#666" }}>Không có đơn đang làm.</div>
          ) : (
            preparing.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedOrderId(o.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: selectedOrderId === o.id ? "2px solid #111827" : "1px solid #eee",
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 10,
                  background: "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <b>Order #{o.id}</b>
                  <StatusBadge status={o.status} />
                </div>
                <div style={{ marginTop: 6, color: "#374151" }}>Table ID: {o.table_id}</div>
                <div style={{ marginTop: 6 }}>
                  Total: <b>{Number(o.grand_total ?? o.total ?? 0).toLocaleString()} đ</b>
                </div>
              </button>
            ))
          )}
        </div>

        {/* COMPLETED */}
        <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>COMPLETED ({completed.length})</h3>

          {completed.length === 0 ? (
            <div style={{ color: "#666" }}>Chưa có đơn hoàn thành.</div>
          ) : (
            completed.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedOrderId(o.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: selectedOrderId === o.id ? "2px solid #111827" : "1px solid #eee",
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 10,
                  background: "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <b>Order #{o.id}</b>
                  <StatusBadge status={o.status} />
                </div>
                <div style={{ marginTop: 6, color: "#374151" }}>Table ID: {o.table_id}</div>
                <div style={{ marginTop: 6 }}>
                  Total: <b>{Number(o.grand_total ?? o.total ?? 0).toLocaleString()} đ</b>
                </div>
              </button>
            ))
          )}
        </div>

        {/* DETAIL */}
        <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Order Detail</h3>

          {!selected ? (
            <div style={{ color: "#666" }}>Chọn 1 order bên trái để xem chi tiết.</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>Order #{selected.id}</div>
                  <div style={{ marginTop: 6 }}>
                    Status: <StatusBadge status={selected.status} />
                  </div>
                  <div style={{ marginTop: 6 }}>Table ID: {selected.table_id}</div>
                  <div style={{ marginTop: 6 }}>
                    Total: <b>{Number(selected.grand_total ?? selected.total ?? 0).toLocaleString()} đ</b>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  {selected.status === "RECEIVED" ? (
                    <button
                      onClick={() => changeStatus(selected.id, "PREPARING")}
                      style={{ padding: "10px 12px", cursor: "pointer" }}
                    >
                      Start Preparing
                    </button>
                  ) : null}

                  {selected.status === "PREPARING" ? (
                    <button
                      onClick={() => changeStatus(selected.id, "COMPLETED")}
                      style={{ padding: "10px 12px", cursor: "pointer" }}
                    >
                      Mark Completed
                    </button>
                  ) : null}
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