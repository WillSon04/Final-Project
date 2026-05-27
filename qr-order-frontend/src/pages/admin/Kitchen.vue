<template>
  <div class="admin-shell kitchen-admin">
    <router-link to="/admin" class="admin-admin-back">← Về khu vực nhân viên</router-link>

    <header class="kitchen-header">
      <h1>Bếp — theo bàn</h1>
      <p class="kitchen-sub">
        Mỗi bàn xử lý <strong>theo thứ tự đơn</strong>: hoàn thành đơn cũ rồi mới chế biến đơn tiếp theo.
        Cập nhật mỗi {{ POLL_MS / 1000 }} giây.
      </p>
    </header>

    <div class="kitchen-grid" aria-label="Danh sách bàn">
      <button
        v-for="tid in tableSlots"
        :key="tid"
        type="button"
        class="kitchen-tile"
        :class="tileClass(tid)"
        @click="selectTable(tid)"
      >
        <span class="kitchen-tile__label">Bàn {{ tid }}</span>
        <div v-if="tableHasNewAlert(tid) || queuedCount(tid) > 0" class="kitchen-tile__badges">
          <span v-if="tableHasNewAlert(tid)" class="kitchen-badge kitchen-badge--new">Mới</span>
          <span v-if="queuedCount(tid) > 0" class="kitchen-badge kitchen-badge--queue">
            +{{ queuedCount(tid) }} chờ
          </span>
        </div>
        <span v-if="tileStatus(tid)" class="kitchen-tile__status">{{ tileStatus(tid) }}</span>
        <span v-else-if="!queuedCount(tid)" class="kitchen-tile__empty">Trống</span>
      </button>
    </div>

    <transition name="kitchen-drawer">
      <aside v-if="selectedTableId != null" class="kitchen-drawer" role="dialog" aria-labelledby="kitchen-drawer-title">
        <div class="kitchen-drawer__head">
          <h2 id="kitchen-drawer-title">Bàn {{ selectedTableId }}</h2>
          <button type="button" class="kitchen-drawer__close" @click="closeDrawer">Đóng</button>
        </div>

        <div v-if="panelLoading" class="kitchen-drawer__loading">Đang tải chi tiết…</div>

        <template v-else>
          <section v-if="activeOrder" class="kitchen-section">
            <h3>Đơn đang xử lý</h3>
            <div class="kitchen-active-meta">
              <span>#{{ activeOrder.id }}</span>
              <span>{{ formatKitchenStatus(activeOrder.status) }}</span>
              <span class="kitchen-active-meta__count">{{ activeItemCount }} món</span>
            </div>

            <div v-if="panelOrderDetail && panelOrderDetail.items && panelOrderDetail.items.length" class="kitchen-items">
              <div v-for="row in panelOrderDetail.items" :key="row.id" class="kitchen-item-row">
                <span class="kitchen-item-row__name">{{ row.name }}</span>
                <span class="kitchen-item-row__qty">× {{ row.quantity }}</span>
              </div>
            </div>
            <p v-else class="kitchen-muted">Không có dòng món.</p>

            <div class="kitchen-actions">
              <button
                v-if="activeOrder.status === 'RECEIVED'"
                type="button"
                class="kitchen-btn kitchen-btn--primary"
                @click="updateStatus(activeOrder.id, 'PREPARING')"
              >
                Bắt đầu chế biến
              </button>
              <button
                v-if="activeOrder.status === 'PREPARING'"
                type="button"
                class="kitchen-btn kitchen-btn--primary"
                @click="updateStatus(activeOrder.id, 'COMPLETED')"
              >
                Hoàn thành món
              </button>
            </div>
          </section>

          <section v-else class="kitchen-section kitchen-muted">
            <p>Bàn này hiện không có đơn <strong>Đã tiếp nhận</strong> hoặc <strong>Đang chế biến</strong>.</p>
          </section>

          <section v-if="queuedOrders.length > 0" class="kitchen-section kitchen-queue">
            <h3>Đơn chờ ({{ queuedOrders.length }})</h3>
            <p class="kitchen-muted kitchen-queue-hint">
              Hoàn thành đơn #{{ activeOrder?.id }} trước, sau đó mới xử lý các đơn dưới đây.
            </p>
            <ul class="kitchen-queue-list">
              <li v-for="q in queuedOrders" :key="q.id" class="kitchen-queue-card">
                <div class="kitchen-queue-card__head">
                  <span>#{{ q.id }}</span>
                  <span>{{ formatKitchenStatus(q.status) }}</span>
                  <span>{{ queuedItemCount(q.id) }} món</span>
                </div>
                <ul
                  v-if="queuedOrderDetails[q.id]?.items?.length"
                  class="kitchen-queue-items"
                >
                  <li v-for="row in queuedOrderDetails[q.id].items" :key="row.id">
                    {{ row.name }} × {{ row.quantity }}
                  </li>
                </ul>
              </li>
            </ul>
          </section>

          <section class="kitchen-section">
            <h3>Lịch sử đơn (bàn {{ selectedTableId }})</h3>
            <p v-if="historyLoading" class="kitchen-muted">Đang tải lịch sử…</p>
            <div v-else-if="tableHistory.length === 0" class="kitchen-muted">Chưa có đơn nào.</div>
            <ul v-else class="kitchen-history-list">
              <li v-for="entry in tableHistory" :key="entry.order_id" class="kitchen-history-card">
                <div class="kitchen-history-card__top">
                  <span>#{{ entry.order_id }}</span>
                  <span>{{ formatKitchenStatus(entry.status) }}</span>
                  <span class="kitchen-history-card__time">{{ formatTime(entry.created_at) }}</span>
                </div>
                <ul class="kitchen-history-items">
                  <li v-for="(it, idx) in entry.items" :key="idx">
                    {{ it.name }} × {{ it.quantity }}
                  </li>
                  <li v-if="!entry.items || entry.items.length === 0" class="kitchen-muted">(Không có món)</li>
                </ul>
              </li>
            </ul>
          </section>
        </template>
      </aside>
    </transition>

    <div v-if="selectedTableId != null" class="kitchen-backdrop" aria-hidden="true" @click="closeDrawer" />
  </div>
</template>

<script>
import { api } from "../../api/api"
import "../../css/admin/admin-common.css"
import "../../css/admin/Kitchen.css"

import { TABLE_COUNT as KITCHEN_TABLE_COUNT } from "../../config/tables.js"

const POLL_MS = 4000

export default {
  data() {
    return {
      KITCHEN_TABLE_COUNT,
      POLL_MS,
      tableSlots: Array.from({ length: KITCHEN_TABLE_COUNT }, (_, i) => i + 1),

      listLoading: false,
      pollTimer: null,
      /** @type {Record<number, number>} */
      lastSeenOrderIdByTable: {},
      /** @type {number[]} */
      newAlertTableIds: [],
      /** @type {Record<number, object>} */
      activeOrderByTable: {},
      /** @type {Record<number, object[]>} */
      queuedOrdersByTable: {},

      selectedTableId: null,
      panelLoading: false,
      panelOrderDetail: null,
      /** @type {Record<number, { items: object[] }>} */
      queuedOrderDetails: {},
      historyLoading: false,
      tableHistory: []
    }
  },

  computed: {
    activeOrder() {
      const tid = this.selectedTableId
      if (tid == null) return null
      return this.activeOrderByTable[tid] || null
    },

    queuedOrders() {
      const tid = this.selectedTableId
      if (tid == null) return []
      return this.queuedOrdersByTable[tid] || []
    },

    activeItemCount() {
      const items = this.panelOrderDetail?.items || []
      return items.reduce((sum, row) => sum + Number(row.quantity || 0), 0)
    }
  },

  mounted() {
    this.refreshKitchen(true)
    this.pollTimer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return
      this.refreshKitchen(false)
    }, POLL_MS)
  },

  beforeUnmount() {
    if (this.pollTimer != null) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  },

  methods: {
    queuedItemCount(orderId) {
      const items = this.queuedOrderDetails[orderId]?.items || []
      if (items.length) {
        return items.reduce((sum, row) => sum + Number(row.quantity || 0), 0)
      }
      const entry = (this.tableHistory || []).find(
        (e) => Number(e.order_id) === Number(orderId)
      )
      if (!entry?.items?.length) return 0
      return entry.items.reduce((sum, it) => sum + Number(it.quantity || 0), 0)
    },

    formatKitchenStatus(code) {
      const u = (code || "").toString().toUpperCase()
      if (u === "RECEIVED") return "Đã tiếp nhận"
      if (u === "PREPARING") return "Đang chế biến"
      if (u === "COMPLETED") return "Hoàn thành"
      if (u === "PAID") return "Đã thanh toán"
      return code || "—"
    },

    formatTime(iso) {
      if (!iso) return ""
      try {
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) return ""
        return d.toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        })
      } catch {
        return ""
      }
    },

    tileStatus(tableId) {
      const o = this.activeOrderByTable[tableId]
      if (!o) return ""
      return this.formatKitchenStatus(o.status)
    },

    tableHasNewAlert(tableId) {
      return this.newAlertTableIds.includes(tableId)
    },

    queuedCount(tableId) {
      return (this.queuedOrdersByTable[tableId] || []).length
    },

    tileClass(tableId) {
      const o = this.activeOrderByTable[tableId]
      return {
        "kitchen-tile--empty": !o,
        "kitchen-tile--received": o && o.status === "RECEIVED",
        "kitchen-tile--prep": o && o.status === "PREPARING",
        "kitchen-tile--pulse": this.tableHasNewAlert(tableId),
        "kitchen-tile--has-queue": this.queuedCount(tableId) > 0
      }
    },

    async refreshKitchen(isInitial) {
      try {
        const res = await api.get("/orders")
        const rows = res.data || []
        const kitchen = rows.filter(
          (o) =>
            (o.status === "RECEIVED" || o.status === "PREPARING") &&
            Number(o.table_id) >= 1 &&
            Number(o.table_id) <= KITCHEN_TABLE_COUNT
        )

        const byTable = {}
        const queuedByTable = {}
        const perTable = {}

        for (const o of kitchen) {
          const t = Number(o.table_id)
          if (!perTable[t]) perTable[t] = []
          perTable[t].push(o)
        }

        for (let t = 1; t <= KITCHEN_TABLE_COUNT; t++) {
          const list = (perTable[t] || []).sort((a, b) => a.id - b.id)
          if (!list.length) continue
          byTable[t] = list[0]
          if (list.length > 1) {
            queuedByTable[t] = list.slice(1)
          }
        }

        this.activeOrderByTable = byTable
        this.queuedOrdersByTable = queuedByTable

        if (isInitial) {
          for (let t = 1; t <= KITCHEN_TABLE_COUNT; t++) {
            const o = byTable[t]
            this.lastSeenOrderIdByTable[t] = o ? o.id : 0
          }
          return
        }

        for (let t = 1; t <= KITCHEN_TABLE_COUNT; t++) {
          const o = byTable[t]
          const prev = this.lastSeenOrderIdByTable[t] || 0
          if (o && o.status === "RECEIVED" && o.id > prev) {
            if (!this.newAlertTableIds.includes(t)) {
              this.newAlertTableIds.push(t)
            }
          }
          if (o) {
            this.lastSeenOrderIdByTable[t] = o.id
          }
        }

        if (this.selectedTableId != null) {
          await this.loadTablePanel(this.selectedTableId, { silentHistory: true })
        }
      } catch (err) {
        console.error(err)
      }
    },

    selectTable(tableId) {
      this.selectedTableId = tableId
      this.newAlertTableIds = this.newAlertTableIds.filter((id) => id !== tableId)
      this.loadTablePanel(tableId)
    },

    closeDrawer() {
      this.selectedTableId = null
      this.panelOrderDetail = null
      this.queuedOrderDetails = {}
      this.tableHistory = []
    },

    async loadTablePanel(tableId, opts = {}) {
      const silentHistory = opts.silentHistory === true
      if (!silentHistory) {
        this.panelLoading = true
        this.historyLoading = true
      }

      try {
        const active = this.activeOrderByTable[tableId] || null
        const queued = this.queuedOrdersByTable[tableId] || []

        const reqs = [api.get(`/orders/table/${tableId}/kitchen-history`)]
        if (active) reqs.push(api.get(`/orders/${active.id}`))
        for (const q of queued) {
          reqs.push(api.get(`/orders/${q.id}`))
        }

        const results = await Promise.all(reqs)
        let idx = 0
        this.tableHistory = results[idx++].data || []

        if (active) {
          this.panelOrderDetail = results[idx++].data
        } else {
          this.panelOrderDetail = null
        }

        const details = {}
        for (const q of queued) {
          const res = results[idx++]
          if (res?.data) {
            details[q.id] = { items: res.data.items || [] }
          }
        }
        this.queuedOrderDetails = details
      } catch (err) {
        console.error(err)
        this.tableHistory = []
        this.panelOrderDetail = null
        this.queuedOrderDetails = {}
      } finally {
        this.panelLoading = false
        this.historyLoading = false
      }
    },

    async updateStatus(orderId, status) {
      try {
        await api.patch(`/orders/${orderId}/status`, { status })
        await this.refreshKitchen(false)
        if (status === "COMPLETED") {
          window.alert("Món đã hoàn thành — có thể mang ra cho khách.")
        }
      } catch (err) {
        console.error(err)
        const code = err?.response?.data?.error
        if (code === "PRIOR_ORDER_IN_PROGRESS") {
          const prior = err?.response?.data?.prior_order_id
          window.alert(
            `Phải hoàn thành đơn #${prior} trước khi xử lý đơn này.`
          )
        } else {
          window.alert("Không cập nhật được trạng thái. Thử lại.")
        }
      }
    }
  }
}
</script>
