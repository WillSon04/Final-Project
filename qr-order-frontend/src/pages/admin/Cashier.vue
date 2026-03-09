<template>
  <div>

    <h1>Cashier Dashboard</h1>

    <div v-if="orders.length === 0">
      No completed orders
    </div>

    <div
      v-for="order in orders"
      :key="order.id"
      class="order-card"
    >

      <h3>Order #{{ order.id }}</h3>

      <p>Table: {{ order.table_id }}</p>

      <p>Total: {{ order.grand_total }} VND</p>

      <button @click="payOrder(order.id)">
        Pay
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

        const res = await api.get("/orders?status=COMPLETED")

        this.orders = res.data

      } catch (err) {

        console.error(err)

      }

    },

    async payOrder(orderId) {

      try {

        // cập nhật trạng thái order thành PAID
        await api.patch(`/orders/${orderId}/status`, {

          status: "PAID"

        })

        // reload danh sách
        this.fetchOrders()

        alert("Payment completed for order #" + orderId)

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