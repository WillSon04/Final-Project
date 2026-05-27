import { createRouter, createWebHistory } from "vue-router"

import Home from "../pages/Home.vue"
import TableMenu from "../pages/TableMenu.vue"
import OrderStatus from "../pages/OrderStatus.vue"

import AdminHub from "../pages/admin/AdminHub.vue"
import Kitchen from "../pages/admin/Kitchen.vue"
import Cashier from "../pages/admin/Cashier.vue"
import AdminRatings from "../pages/admin/AdminRatings.vue"
import ThankYouFeedback from "../pages/ThankYouFeedback.vue"

const routes = [
  { path: "/", component: Home },
  { path: "/t/:tableCode/cam-on", component: ThankYouFeedback },
  { path: "/t/:tableCode", component: TableMenu },
  { path: "/order/:orderId", component: OrderStatus },

  { path: "/admin", component: AdminHub },
  { path: "/admin/kitchen", component: Kitchen },
  { path: "/admin/cashier", component: Cashier },
  { path: "/admin/ratings", component: AdminRatings },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router