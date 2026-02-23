require("dotenv").config();
const express = require("express");
const cors = require("cors");

const menuRoutes = require("./routes/menu.routes");
const orderRoutes = require("./routes/orders.routes");
const paymentRoutes = require("./routes/payments.routes");
const tableRoutes = require("./routes/tables.routes");
const cashierRoutes = require("./routes/cashier.routes");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/cashier", cashierRoutes);
const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});