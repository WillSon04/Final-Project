<template>
  <div>
    <h1>Order {{ orderId }}</h1>

    <div v-if="loading">Loading...</div>

    <div v-if="!loading && order">
      <p>Status: {{ order.status }}</p>
      <p>Total: {{ order.grand_total }}</p>

      <h3>Items</h3>

      <div v-for="item in items" :key="item.id" class="order-item">
        <p>{{ item.name }} x {{ item.quantity }}</p>
        <p>{{ item.line_total }} VND</p>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from "../api/api"
import { useRoute } from "vue-router"

export default {

  setup() {
    const route = useRoute()
    const orderId = route.params.orderId
    return { orderId }
  },

  data() {
    return {
      order: null,
      items: [],
      loading: true
    }
  },

  mounted() {
    this.fetchOrder()

    // auto refresh mỗi 5 giây
    setInterval(() => {
      this.fetchOrder()
    }, 5000)
  },

  methods: {

    async fetchOrder() {

      try {

        const res = await api.get(`/orders/${this.orderId}`)

        this.order = res.data.order
        this.items = res.data.items

        this.loading = false

      } catch (err) {

        console.error(err)

      }

    }

  }

}
</script>

<style>
.order-item {
  border: 1px solid #ccc;
  padding: 10px;
  margin-bottom: 10px;
}
</style>