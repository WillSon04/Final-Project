Project: QR Code Ordering System (Final Project)

Stack
Frontend: Vue 3, Vue Router, Axios, Vite
Backend: Node.js, Express
Database: MySQL

Main Flow
Customer: scan QR → /t/:tableCode → view menu → add items → order auto-created
Kitchen: /admin/kitchen → RECEIVED → PREPARING → COMPLETED
Cashier: /admin/cashier → COMPLETED → PAID

Order Status
RECEIVED
PREPARING
COMPLETED
PAID

Backend APIs
GET /api/menu/items
GET /api/menu/categories
POST /api/orders
POST /api/orders/:id/items
GET /api/orders/:id
PATCH /api/orders/:id/status
GET /api/orders?status=

Important Logic
• tableCode is numeric (1,2,3)
• Order auto-created when first item added
• If order is COMPLETED and customer adds more items → create new order automatically

Project Structure
qr-order-backend/
routes/
orders.js
menu.js
db.js
server.js

qr-order-frontend/
src/
views/
TableMenu.vue
Kitchen.vue
Cashier.vue
OrderStatus.vue
router/
index.js
api/
api.js
