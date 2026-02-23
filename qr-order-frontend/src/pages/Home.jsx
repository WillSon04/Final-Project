import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [tableCode, setTableCode] = useState("T01");
  const nav = useNavigate();

  return (
    <div style={{ padding: 16, fontFamily: "Arial" }}>
      <h2>QR Order</h2>
      <p>Nhập mã bàn để giả lập quét QR:</p>

      <input
        value={tableCode}
        onChange={(e) => setTableCode(e.target.value)}
        style={{ padding: 8, width: 180 }}
        placeholder="T01"
      />
      <button
        onClick={() => nav(`/t/${encodeURIComponent(tableCode)}`)}
        style={{ marginLeft: 8, padding: "8px 12px" }}
      >
        Go
      </button>

      <p style={{ marginTop: 16, color: "#666" }}>
        QR thật sẽ là link dạng: <code>http://localhost:5173/t/T01</code>
      </p>
    </div>
  );
}