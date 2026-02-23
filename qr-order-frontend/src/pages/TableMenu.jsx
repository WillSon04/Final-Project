import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "/src/api";

export default function TableMenu() {
  const { tableCode } = useParams();
  const nav = useNavigate();

  const [table, setTable] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const cartLines = useMemo(() => Object.values(cart), [cart]);
  const cartTotal = useMemo(
    () => cartLines.reduce((s, l) => s + Number(l.item.price) * l.qty, 0),
    [cartLines]
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const [tableRes, catRes, itemRes] = await Promise.all([
          api.get(`/api/tables/by-code/${encodeURIComponent(tableCode)}`),
          api.get("/api/menu/categories"),
          api.get("/api/menu/items"),
        ]);

        setTable(tableRes.data);
        setCategories(catRes.data);
        setItems(itemRes.data);
      } catch (e) {
        setErr(e?.response?.data?.error || e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [tableCode]);

  function addToCart(item) {
    setCart((prev) => {
      const key = String(item.id);
      const old = prev[key];
      return {
        ...prev,
        [key]: { item, qty: old ? old.qty + 1 : 1, note: old?.note || "" },
      };
    });
  }

  function updateQty(menuId, qty) {
    setCart((prev) => {
      const key = String(menuId);
      if (!prev[key]) return prev;
      if (qty <= 0) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      return { ...prev, [key]: { ...prev[key], qty } };
    });
  }

  function updateNote(menuId, note) {
    setCart((prev) => {
      const key = String(menuId);
      if (!prev[key]) return prev;
      return { ...prev, [key]: { ...prev[key], note } };
    });
  }

  async function placeOrder() {
    try {
      setErr("");
      if (!table?.id) return;
      if (cartLines.length === 0) return;

      const orderRes = await api.post("/api/orders", { table_id: table.id });
      const orderId = orderRes.data.order_id;

      for (const line of cartLines) {
        await api.post(`/api/orders/${orderId}/items`, {
          menu_item_id: line.item.id,
          quantity: line.qty,
          note: line.note,
        });
      }

      setCart({});
      nav(`/order/${orderId}`);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  }

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (err) return <div style={{ padding: 16, color: "crimson" }}>Error: {err}</div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, padding: 16, fontFamily: "Arial" }}>
      <div>
        <h2>Menu — {table?.name || tableCode}</h2>

        {categories.map((c) => (
          <div key={c.id} style={{ marginBottom: 18 }}>
            <h3 style={{ borderBottom: "1px solid #ddd", paddingBottom: 6 }}>{c.name}</h3>

            <div style={{ display: "grid", gap: 10 }}>
              {items.filter((it) => it.category_id === c.id).map((it) => (
                <div key={it.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{it.name}</div>
                    <div style={{ color: "#555", fontSize: 13 }}>{it.description}</div>
                    <div style={{ marginTop: 6 }}>{Number(it.price).toLocaleString()} đ</div>
                  </div>
                  <button onClick={() => addToCart(it)} style={{ padding: "8px 12px" }}>
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, height: "fit-content" }}>
        <h3>Cart</h3>

        {cartLines.length === 0 ? (
          <div style={{ color: "#666" }}>Chưa có món.</div>
        ) : (
          <>
            {cartLines.map((line) => (
              <div key={line.item.id} style={{ borderTop: "1px solid #f1f1f1", paddingTop: 10, marginTop: 10 }}>
                <div style={{ fontWeight: 700 }}>{line.item.name}</div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                  <button onClick={() => updateQty(line.item.id, line.qty - 1)}>-</button>
                  <div>Qty: {line.qty}</div>
                  <button onClick={() => updateQty(line.item.id, line.qty + 1)}>+</button>
                </div>

                <input
                  value={line.note}
                  onChange={(e) => updateNote(line.item.id, e.target.value)}
                  placeholder="Ghi chú (ít cay, không đá...)"
                  style={{ marginTop: 8, padding: 8, width: "100%" }}
                />

                <div style={{ marginTop: 6 }}>
                  Line: {(Number(line.item.price) * line.qty).toLocaleString()} đ
                </div>
              </div>
            ))}

            <div style={{ marginTop: 12, fontWeight: 800 }}>
              Total: {cartTotal.toLocaleString()} đ
            </div>

            <button onClick={placeOrder} style={{ marginTop: 12, width: "100%", padding: 10 }}>
              Place Order
            </button>
          </>
        )}
      </div>
    </div>
  );
}