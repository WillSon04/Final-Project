import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import TableMenu from "./pages/TableMenu";
import OrderStatus from "./pages/OrderStatus";
import Kitchen from "./pages/admin/Kitchen";
import Cashier from "./pages/admin/Cashier";
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/t/:tableCode" element={<TableMenu />} />
      <Route path="/order/:orderId" element={<OrderStatus />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/admin/kitchen" element={<Kitchen />} />
      <Route path="/admin/cashier" element={<Cashier />} />
    </Routes>
  );
}