<template>

  <div class="order-detail">

    <header class="order-detail-head">

      <p class="eyebrow">Chi tiết đơn hàng</p>

      <h1 class="order-title">Đơn #{{ orderId }}</h1>

      <p v-if="order && tableLabel" class="table-line">Bàn {{ tableLabel }}</p>

    </header>



    <div v-if="loading" class="state-block">Đang tải...</div>



    <div v-else-if="errorMessage" class="state-block error">{{ errorMessage }}</div>



    <template v-else-if="order">

      <section class="status-card">

        <div class="status-row">

          <span class="label">Trạng thái</span>

          <span class="status-badge">{{ formatStatus(order.status) }}</span>

        </div>

        <div class="status-row">

          <span class="label">Thời điểm</span>

          <span class="value muted">{{ formatDate(order.created_at) }}</span>

        </div>

        <p v-if="statusHint" class="status-hint muted">{{ statusHint }}</p>

      </section>



      <section class="items-card">

        <h2 class="section-title">Món đã gọi</h2>

        <div v-if="items.length === 0" class="muted">Chưa có dòng món.</div>

        <ul v-else class="item-list">

          <li v-for="item in items" :key="item.id" class="item-row">

            <div class="item-main">

              <span class="item-name">{{ item.name }}</span>

              <span class="item-qty">× {{ item.quantity }}</span>

            </div>

          </li>

        </ul>

        <p v-if="totalItemCount > 0" class="items-summary">
          Tổng cộng: <strong>{{ totalItemCount }}</strong> phần món
        </p>

      </section>



      <div class="actions">
        <router-link
          v-if="tableLink && order.status !== 'PAID'"
          class="btn btn-secondary"
          :to="tableLink"
        >
          Gọi thêm món
        </router-link>
      </div>

      <p v-if="footerHint" class="hint muted">{{ footerHint }}</p>

    </template>

  </div>

</template>



<script>

import { api } from "../api/api"

import { useRoute, useRouter } from "vue-router"
import { isTableVisitActive } from "../utils/tableSession"
import "../css/OrderStatus.css"



export default {

  setup() {

    const route = useRoute()
    const router = useRouter()
    const orderId = route.params.orderId
    return { orderId, router }

  },



  data() {

    return {

      order: null,

      items: [],

      loading: true,

      errorMessage: "",

      pollTimer: null,

      redirectingToThanks: false
    }

  },



  computed: {

    tableLabel() {

      if (!this.order || this.order.table_id == null) return ""

      return String(this.order.table_id)

    },



    tableLink() {
      if (!this.order || this.order.table_id == null) return null
      return `/t/${this.order.table_id}`
    },

    totalItemCount() {
      return (this.items || []).reduce(
        (sum, row) => sum + Number(row.quantity || 0),
        0
      )
    },

    statusHint() {
      const s = (this.order?.status || "").toUpperCase()
      if (s === "RECEIVED") return "Đơn đã gửi tới bếp."
      if (s === "PREPARING") return "Bếp đang chuẩn bị món cho bạn."
      if (s === "COMPLETED") {
        return "Món đã sẵn sàng. Gọi thanh toán tại trang thực đơn khi bạn muốn trả tiền."
      }
      if (s === "PAID") return "Đã thanh toán. Đang chuyển sang trang cảm ơn…"
      return ""
    },

    footerHint() {
      const s = (this.order?.status || "").toUpperCase()
      if (s === "PAID") return ""
      return "Thanh toán: quay lại thực đơn và bấm「Gọi TT」ở góc dưới màn hình."
    }
  },



  mounted() {

    this.fetchOrder()

    this.pollTimer = window.setInterval(() => {

      this.fetchOrder({ silent: true })

    }, 5000)

  },



  beforeUnmount() {

    if (this.pollTimer) {

      clearInterval(this.pollTimer)

      this.pollTimer = null

    }

  },



  methods: {
    formatStatus(code) {

      const map = {

        RECEIVED: "Đã tiếp nhận",

        PREPARING: "Đang chế biến",

        COMPLETED: "Hoàn thành — chờ thanh toán",

        PAID: "Đã thanh toán"

      }

      return map[code] || code || "—"

    },



    formatDate(value) {

      if (!value) return "—"

      try {

        const d = new Date(value)

        if (Number.isNaN(d.getTime())) return String(value)

        return d.toLocaleString("vi-VN", {

          hour: "2-digit",

          minute: "2-digit",

          day: "2-digit",

          month: "2-digit",

          year: "numeric"

        })

      } catch {

        return String(value)

      }

    },



    async maybeRedirectToThanks() {
      const tableId = this.order?.table_id
      if (!tableId || this.redirectingToThanks || !isTableVisitActive(tableId)) {
        return
      }
      try {
        const res = await api.get(`/tables/${tableId}/checkout-status`)
        if (!res.data?.ready_for_guest_confirm) return
        this.redirectingToThanks = true
        this.router.replace(`/t/${tableId}/cam-on`)
      } catch (err) {
        console.warn("maybeRedirectToThanks", err)
      }
    },

    async fetchOrder(opts = {}) {

      const silent = opts.silent === true

      if (!silent) this.loading = true

      try {

        const res = await api.get(`/orders/${this.orderId}`)

        this.order = res.data.order

        this.items = res.data.items || []

        this.errorMessage = ""

        await this.maybeRedirectToThanks()

      } catch (err) {

        console.error(err)

        if (!err?.response) {

          this.errorMessage =

            "Không kết nối được máy chủ. Kiểm tra backend đang chạy (npm run dev)."

        } else {

          this.errorMessage = "Không tải được đơn hàng. Kiểm tra mã đơn hoặc backend."

        }

        if (!silent) {

          this.order = null

          this.items = []

        }

      } finally {

        if (!silent) this.loading = false

      }

    }

  }

}

</script>

