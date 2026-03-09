<template>
  <div>

    <h1>Menu - Table {{ tableCode }}</h1>

    <p v-if="orderId">
      Current Order ID: {{ orderId }}
    </p>

    <!-- Loading -->
    <div v-if="items.length === 0">
      Loading menu...
    </div>

    <!-- Menu items -->
    <div
      v-for="item in items"
      :key="item.id"
      class="menu-item"
    >

      <h3>{{ item.name }}</h3>

      <p>{{ item.description }}</p>

      <p>${{ item.price }}</p>

      <button @click="addItem(item)">
        Add
      </button>

    </div>

  </div>
</template>

<script>

import { api } from "../api/api"
import { useRoute } from "vue-router"

export default {

  setup() {

    const route = useRoute()

    const tableCode = Number(route.params.tableCode)

    return { tableCode }

  },

  data() {

    return {
      items: [],
      orderId: null
    }

  },

  async mounted() {

    try {

      // load menu
      const res = await api.get("/menu/items")

      this.items = res.data

      // check localStorage for existing order
      const savedOrder = localStorage.getItem("orderId")

      if (savedOrder) {
        this.orderId = savedOrder
      }

    } catch (err) {

      console.error("API ERROR:", err)

    }

  },

  methods: {

    async createOrder() {

      try {

        const res = await api.post("/orders", {
          table_id: this.tableCode
        })

        this.orderId = res.data.order_id

        localStorage.setItem("orderId", this.orderId)

        console.log("Order created:", this.orderId)

      } catch (err) {

        console.error(err)
        alert("Cannot create order")

      }

    },

    async addItem(item) {

try {

  if (!this.orderId) {

    await this.createOrder()

  }

  await api.post(`/orders/${this.orderId}/items`, {

    menu_item_id: item.id,
    quantity: 1

  })

  alert(item.name + " added")

} catch (err) {

  const errorCode = err?.response?.data?.error

  // nếu order đã closed -> tạo order mới
  if (errorCode === "ORDER_CLOSED") {

    console.log("Order closed, creating new order")

    await this.createOrder()

    await api.post(`/orders/${this.orderId}/items`, {

      menu_item_id: item.id,
      quantity: 1

    })

    alert("New order created. " + item.name + " added")

  } else {

    console.error(err)

  }

}

}

  }}

</script>

<style>

.menu-item {
  border: 1px solid #ccc;
  padding: 10px;
  margin-bottom: 10px;
}

</style>