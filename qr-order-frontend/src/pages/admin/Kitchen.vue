<template>
  <div>
    <h1>Kitchen Dashboard</h1>

    <div v-if="orders.length === 0">
      No orders
    </div>

    <div v-for="order in orders" :key="order.id" class="order-card">
      <h3>Order #{{ order.id }}</h3>

      <p>Table: {{ order.table_id }}</p>

      <p>Status: {{ order.status }}</p>

      <p>Total: {{ order.grand_total }} VND</p>

      <button
        v-if="order.status === 'RECEIVED'"
        @click="updateStatus(order.id, 'PREPARING')"
      >
        Start Preparing
      </button>

      <button
        v-if="order.status === 'PREPARING'"
        @click="updateStatus(order.id, 'COMPLETED')"
      >
        Mark Completed
      </button>
    </div>
  </div>
</template>

<script>
import { api } from "../../api/api"

export default {

  data() {
    return {
      orders: []
    }
  },

  mounted() {
    this.fetchOrders()

    // auto refresh mỗi 5 giây
    setInterval(() => {
      this.fetchOrders()
    }, 5000)
  },

  methods: {

    async fetchOrders() {

      try {

        const res = await api.get("/orders")

        this.orders = res.data

      } catch (err) {

        console.error(err)

      }

    },

    async updateStatus(id, status) {

      try {

        await api.patch(`/orders/${id}/status`, {
          status: status
        })

        this.fetchOrders()

      } catch (err) {

        console.error(err)

      }

    }

  }

}
</script>

<style>
.order-card {
  border: 1px solid #ccc;
  padding: 15px;
  margin-bottom: 15px;
}
</style>