import { createRouter, createWebHistory } from "vue-router"

import Home from "../pages/Home.vue"
import TableMenu from "../pages/TableMenu.vue"
import OrderStatus from "../pages/OrderStatus.vue"

import Kitchen from "../pages/admin/Kitchen.vue"
import Cashier from "../pages/admin/Cashier.vue"

const routes = [
  { path: "/", component: Home },
  { path: "/t/:tableCode", component: TableMenu },
  { path: "/order/:orderId", component: OrderStatus },

  { path: "/admin/kitchen", component: Kitchen },
  { path: "/admin/cashier", component: Cashier }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router