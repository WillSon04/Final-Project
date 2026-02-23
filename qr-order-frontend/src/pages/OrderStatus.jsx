import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "/src/api";

export default function OrderStatus() {
  const { orderId } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let timer;

    async function load() {
      try {
        setErr("");
        const res = await api.get(`/api/orders/${orderId}`);
        setData(res.data);
      } catch (e) {
        setErr(e?.response?.data?.error || e.message);
      }
    }

    load();
    timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [orderId]);

  if (err) return <div style={{ padding: 16, color: "crimson" }}>Error: {err}</div>;
  if (!data) return <div style={{ padding: 16 }}>Loading...</div>;

  const { order, items } = data;

  return (
    <div style={{ padding: 16, fontFamily: "Arial", maxWidth: 700 }}>
      <h2>Order #{order.id}</h2>
      <div>Status: <b>{order.status}</b></div>
      <div style={{ marginTop: 6 }}>
        Total: <b>{Number(order.grand_total ?? order.total ?? 0).toLocaleString()} đ</b>
      </div>

      <h3 style={{ marginTop: 16 }}>Items</h3>
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((it) => (
          <div key={it.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10 }}>
            <div style={{ fontWeight: 700 }}>{it.name}</div>
            <div>Qty: {it.quantity}</div>
            {it.note ? <div>Note: {it.note}</div> : null}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, color: "#555" }}>
        (Trang này tự refresh mỗi 3 giây để cập nhật trạng thái.)
      </div>
    </div>
  );
}