<template>
  <div class="admin-shell cashier-admin">
    <router-link to="/admin" class="admin-admin-back">← Về khu vực nhân viên</router-link>

    <header class="cashier-header">
      <h1>Thu ngân — theo bàn</h1>
      <p class="cashier-sub">
        {{ TABLE_COUNT }} bàn; bàn có nhãn
        <span class="cashier-badge cashier-badge--request">Gọi TT</span>
        là khách yêu cầu thanh toán. Bill gộp <strong>tất cả lượt gọi món</strong> chưa trả
        của bàn. Cập nhật mỗi {{ POLL_MS / 1000 }} giây.
      </p>
    </header>

    <div class="cashier-grid" aria-label="Danh sách bàn">
      <button
        v-for="tid in tableSlots"
        :key="tid"
        type="button"
        class="cashier-tile"
        :class="tileClass(tid)"
        @click="selectTable(tid)"
      >
        <span class="cashier-tile__label">Bàn {{ tid }}</span>
        <span v-if="tableOverview(tid)?.payment_requested" class="cashier-badge cashier-badge--request">
          Gọi TT
        </span>
        <span v-else-if="tableOverview(tid)?.has_bill" class="cashier-tile__amount">
          {{ formatVnd(tableOverview(tid).grand_total) }}
        </span>
        <span v-else class="cashier-tile__empty">Trống</span>
      </button>
    </div>

    <transition name="cashier-drawer">
      <aside
        v-if="selectedTableId != null"
        class="cashier-drawer"
        role="dialog"
        aria-labelledby="cashier-drawer-title"
      >
        <div class="cashier-drawer__head">
          <h2 id="cashier-drawer-title">Bàn {{ selectedTableId }} — Hóa đơn gộp</h2>
          <button type="button" class="cashier-drawer__close" @click="closeDrawer">Đóng</button>
        </div>

        <div v-if="panelLoading" class="cashier-drawer__loading">Đang tải hóa đơn…</div>

        <template v-else-if="bill">
          <p v-if="bill.payment_requested" class="cashier-alert cashier-alert--request">
            Khách đã yêu cầu thanh toán
            <span v-if="bill.payment_requested_at">
              ({{ formatTime(bill.payment_requested_at) }})
            </span>
          </p>

          <p v-if="bill.pending_kitchen_count > 0" class="cashier-alert cashier-alert--warn">
            Còn {{ bill.pending_kitchen_count }} đơn đang ở bếp — chờ hoàn thành món trước khi thu tiền.
          </p>

          <p v-if="!bill.order_ids.length" class="cashier-muted">Bàn này chưa có đơn chưa thanh toán.</p>

          <template v-else>
            <p class="cashier-meta">
              {{ bill.order_ids.length }} lượt gọi món —
              Đơn: {{ bill.order_ids.map((id) => '#' + id).join(', ') }}
            </p>

            <section class="cashier-section">
              <h3>Tổng hợp món (gộp theo tên)</h3>
              <div v-if="!bill.items.length" class="cashier-muted">Chưa có dòng món.</div>
              <ul v-else class="cashier-item-list">
                <li v-for="row in bill.items" :key="`${row.menu_item_id}-${row.unit_price}`" class="cashier-item-row">
                  <div class="cashier-item-row__main">
                    <span class="cashier-item-row__name">{{ row.name }}</span>
                    <span class="cashier-item-row__qty">× {{ row.quantity }}</span>
                  </div>
                  <div class="cashier-item-row__prices">
                    <span class="cashier-muted">{{ formatVnd(row.unit_price) }}/phần</span>
                    <strong>{{ formatVnd(row.line_total) }}</strong>
                  </div>
                </li>
              </ul>
            </section>

            <section class="cashier-totals">
              <div class="cashier-total-row">
                <span>Tạm tính</span>
                <span>{{ formatVnd(bill.subtotal) }}</span>
              </div>
              <div v-if="bill.vat > 0" class="cashier-total-row">
                <span>VAT</span>
                <span>{{ formatVnd(bill.vat) }}</span>
              </div>
              <div class="cashier-total-row cashier-total-row--grand">
                <span>Tổng thanh toán</span>
                <strong>{{ formatVnd(bill.grand_total) }}</strong>
              </div>
            </section>

            <div v-if="bill.can_pay" class="cashier-actions">
              <button
                type="button"
                class="cashier-btn cashier-btn--primary"
                :disabled="paying"
                @click="payTable('CASH')"
              >
                {{ paying ? "Đang xử lý…" : "Thanh toán tiền mặt" }}
              </button>
              <button
                type="button"
                class="cashier-btn cashier-btn--outline"
                :disabled="paying"
                @click="payTable('CARD')"
              >
                Thanh toán thẻ
              </button>
            </div>
          </template>
        </template>
      </aside>
    </transition>

    <div
      v-if="selectedTableId != null"
      class="cashier-backdrop"
      aria-hidden="true"
      @click="closeDrawer"
    />
  </div>
</template>

<script>
import { api } from "../../api/api"
import { formatVnd } from "../../utils/currency"
import { TABLE_COUNT, tableIds } from "../../config/tables.js"
import "../../css/admin/admin-common.css"
import "../../css/admin/Cashier.css"

const POLL_MS = 4000

const PAY_ERROR_MESSAGES = {
  NO_ORDERS_TO_PAY: "Bàn không có đơn cần thanh toán.",
  ORDERS_STILL_IN_KITCHEN: "Còn món đang chế biến. Đợi bếp hoàn thành rồi thu tiền.",
  ORDER_TOTAL_INVALID: "Tổng tiền không hợp lệ.",
}

export default {
  data() {
    return {
      TABLE_COUNT,
      POLL_MS,
      tableSlots: tableIds,
      overviewByTable: {},
      selectedTableId: null,
      panelLoading: false,
      bill: null,
      paying: false,
      loadError: "",
      pollTimer: null,
    }
  },

  mounted() {
    this.refreshOverview()
    this.pollTimer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return
      this.refreshOverview(true)
      if (this.selectedTableId != null) {
        this.loadBill(this.selectedTableId, { silent: true })
      }
    }, POLL_MS)
  },

  beforeUnmount() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  },

  methods: {
    formatVnd,

    formatTime(iso) {
      if (!iso) return ""
      try {
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) return ""
        return d.toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        })
      } catch {
        return ""
      }
    },

    tableOverview(tableId) {
      return this.overviewByTable[tableId] || null
    },

    tileClass(tableId) {
      const o = this.tableOverview(tableId)
      return {
        "cashier-tile--empty": !o?.has_bill,
        "cashier-tile--request": o?.payment_requested,
        "cashier-tile--bill": o?.has_bill && !o?.payment_requested,
      }
    },

    async refreshOverview(silent = false) {
      if (!silent) this.loadError = ""
      try {
        const res = await api.get("/cashier/tables")
        const map = {}
        for (const row of res.data || []) {
          map[row.table_id] = row
        }
        this.overviewByTable = map
      } catch (err) {
        console.error(err)
        if (!silent) {
          this.loadError = err?.message || "Không tải được danh sách bàn."
        }
      }
    },

    selectTable(tableId) {
      this.selectedTableId = tableId
      this.loadBill(tableId)
    },

    closeDrawer() {
      this.selectedTableId = null
      this.bill = null
    },

    async loadBill(tableId, opts = {}) {
      const silent = opts.silent === true
      if (!silent) this.panelLoading = true
      try {
        const res = await api.get(`/cashier/tables/${tableId}/bill`)
        this.bill = res.data
      } catch (err) {
        console.error(err)
        this.bill = null
        if (!silent) window.alert("Không tải được hóa đơn bàn.")
      } finally {
        if (!silent) this.panelLoading = false
      }
    },

    async payTable(method) {
      if (!this.selectedTableId) return
      const tableId = this.selectedTableId
      this.paying = true
      try {
        await api.post(`/cashier/tables/${tableId}/pay`, { method })
        await this.refreshOverview(true)
        this.closeDrawer()
        window.alert(`Đã thanh toán bàn ${tableId}.`)
      } catch (err) {
        console.error(err)
        const code = err?.response?.data?.error
        const msg = PAY_ERROR_MESSAGES[code] || err?.message || "Thanh toán thất bại."
        window.alert(msg)
        await this.loadBill(this.selectedTableId, { silent: true })
      } finally {
        this.paying = false
      }
    },
  },
}
</script>
