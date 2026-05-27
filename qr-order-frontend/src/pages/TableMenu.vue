<template>
  <div class="menu-layout table-menu-page">
    <header class="menu-header">
      <div class="menu-header-top">
        <div class="menu-brand">
          <p class="eyebrow">Bàn {{ tableCode }}</p>
          <h1 class="menu-title">Thực đơn</h1>
          <p v-if="!searchActive && activeCategory" class="menu-subtitle">
            {{ activeCategory.name }}
          </p>
          <p v-else-if="searchActive" class="menu-subtitle muted">
            Kết quả tìm kiếm
          </p>
        </div>
      </div>

      <label class="search-field">
        <span class="sr-only">Tìm món theo tên</span>
        <input
          v-model.trim="searchInput"
          type="search"
          inputmode="search"
          autocomplete="off"
          placeholder="Tìm món (vd: bò, lẩu...)"
          aria-describedby="search-hint"
          @input="onSearchInput"
          @keydown.escape.prevent="clearSearch"
        />
      </label>
      <p id="search-hint" class="search-hint">
        Nhập từ khóa để tìm trong toàn bộ thực đơn. Để trống để xem theo danh mục.
      </p>
    </header>

    <nav class="category-strip" aria-label="Danh mục món">
      <button
        v-for="cat in categories"
        :key="cat.id"
        type="button"
        class="chip"
        :class="{ active: Number(cat.id) === Number(activeCategoryId) && !searchActive }"
        @click="selectCategory(cat.id)"
      >
        {{ cat.name }}
      </button>
    </nav>

    <main class="menu-main">
      <div v-if="catalogLoading" class="state-block">Đang tải thực đơn...</div>
      <div v-else-if="catalogError" class="state-block error">{{ catalogError }}</div>
      <template v-else>
        <p v-if="visibleItems.length === 0" class="state-block muted">
          {{ emptyMessage }}
        </p>
        <div v-else class="dish-grid">
          <article
            v-for="item in visibleItems"
            :key="item.id"
            class="dish-card"
            :class="{ unavailable: !item.is_available || orderingLocked }"
          >
            <div class="dish-media">
              <img
                v-if="item.image_url"
                :src="item.image_url"
                :alt="item.name"
                loading="lazy"
                @error="onImgError"
              />
              <div v-else class="dish-placeholder" aria-hidden="true">
                <span>{{ placeholderLetter(item.name) }}</span>
              </div>
              <span v-if="!item.is_available" class="badge-na">Tạm hết</span>
            </div>
            <div class="dish-body">
              <h2 class="dish-name">{{ item.name }}</h2>
              <p v-if="item.description" class="dish-desc">{{ item.description }}</p>
              <div class="dish-footer">
                <p class="dish-price">{{ formatVnd(item.price) }}</p>
                <div class="qty-control" role="group" :aria-label="'Số lượng ' + item.name">
                  <button
                    type="button"
                    class="qty-btn"
                    aria-label="Giảm"
                    :disabled="getItemCount(item.id) <= 0 || orderingLocked"
                    @click="decreaseItem(item)"
                  >
                    −
                  </button>
                  <span class="qty-value">{{ getItemCount(item.id) }}</span>
                  <button
                    type="button"
                    class="qty-btn"
                    aria-label="Tăng"
                    :disabled="!item.is_available || orderingLocked"
                    @click="increaseItem(item)"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>
      </template>
    </main>

    <section class="panel history-panel">
      <button type="button" class="panel-toggle" @click="toggleHistory">
        {{ historyOpen ? "Ẩn lịch sử đặt món" : "Xem lịch sử đặt món" }}
      </button>
      <div v-if="historyOpen" class="panel-body">
        <p v-if="historyLoading" class="muted">Đang tải lịch sử...</p>
        <p v-else-if="orderHistory.length === 0" class="muted">Chưa có lượt đặt nào.</p>
        <div v-else class="history-list">
          <div
            v-for="(turn, idx) in orderHistory"
            :key="turn.order_id"
            class="history-turn"
          >
            <p class="history-turn-title">
              Lượt {{ idx + 1 }} — Đơn #{{ turn.order_id }}
              <span class="status-pill">{{ formatOrderStatus(turn.status) }}</span>
            </p>
            <ul v-if="turn.items.length" class="history-items">
              <li v-for="row in turn.items" :key="`${turn.order_id}-${row.menu_item_id}`">
                {{ row.name }} × {{ row.quantity }}
              </li>
            </ul>
            <p v-else class="muted">Không có dòng món.</p>
          </div>
        </div>
      </div>
    </section>

    <div v-if="!paymentRequested" class="cart-dock" :class="{ elevated: cartDockElevated }">
      <div class="cart-dock-info">
        <span class="cart-dock-label">Tạm tính</span>
        <strong class="cart-dock-total">{{ formatVnd(selectedTotal) }}</strong>
        <span v-if="cartItemCount > 0" class="cart-dock-badge">{{ cartItemCount }} món</span>
      </div>
      <div class="cart-dock-actions">
        <button
          type="button"
          class="btn-pay-dock"
          :class="{ 'btn-pay-dock--disabled': !canRequestPayment }"
          :disabled="paymentRequesting || !canRequestPayment"
          :title="payDockTitle"
          @click="requestPayment"
        >
          {{ paymentRequesting ? "…" : "Gọi TT" }}
        </button>
        <button
          type="button"
          class="btn btn-secondary dock-btn dock-btn--cart"
          :disabled="cartItemCount === 0"
          @click="openCart"
          aria-label="Giỏ hàng"
        >
          <span class="dock-cart-icon" aria-hidden="true">🛒</span>
          <span v-if="cartItemCount > 0" class="dock-cart-count">{{ cartItemCount }}</span>
        </button>
        <button
          type="button"
          class="btn btn-primary dock-btn"
          :disabled="cartItemCount === 0 || submitting"
          @click="openCartAndFocusSubmit"
        >
          Đặt món
        </button>
      </div>
    </div>

    <div
      v-if="toastMessage"
      class="toast"
      role="status"
      aria-live="polite"
    >
      {{ toastMessage }}
    </div>
  </div>

    <!-- Chờ thanh toán — khóa gọi món -->
    <Teleport to="body">
      <div
        v-if="paymentRequested"
        class="table-menu-overlay payment-wait-portal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-wait-title"
      >
        <div class="payment-wait-backdrop" aria-hidden="true" />
        <div class="payment-wait-card">
          <p id="payment-wait-title" class="payment-wait-card__title">
            Khách hàng đã yêu cầu thanh toán
          </p>
          <p class="payment-wait-card__text">
            Đợi nhân viên đến thanh toán. Trong lúc chờ, quý khách không thể gọi thêm món.
          </p>
          <button
            type="button"
            class="payment-wait-card__cancel"
            :disabled="paymentRequesting"
            @click="cancelPaymentRequest"
          >
            {{ paymentRequesting ? "Đang hủy…" : "Hủy thanh toán" }}
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Giỏ hàng -->
    <Teleport to="body">
      <div v-if="cartOpen && !orderingLocked" class="table-menu-overlay cart-portal">
      <div
        class="cart-backdrop"
        role="presentation"
        @click="closeCart"
      />
      <div class="cart-sheet" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div class="cart-sheet-handle" aria-hidden="true" />
        <div class="cart-sheet-head">
          <h2 id="cart-title">Giỏ hàng</h2>
          <button type="button" class="icon-close" aria-label="Đóng" @click="closeCart">
            ×
          </button>
        </div>
        <div class="cart-sheet-body">
          <p v-if="selectedItems.length === 0" class="muted">Chưa có món trong giỏ.</p>
          <ul v-else class="cart-lines">
            <li v-for="row in selectedItems" :key="row.id" class="cart-line">
              <div class="cart-line-main">
                <span class="cart-line-name">{{ row.name }}</span>
                <span class="cart-line-price">{{ formatVnd(row.subtotal) }}</span>
              </div>
              <div class="qty-control small">
                <button
                  type="button"
                  class="qty-btn"
                  aria-label="Giảm"
                  @click="decreaseItem(row)"
                >
                  −
                </button>
                <span class="qty-value">{{ row.quantity }}</span>
                <button
                  type="button"
                  class="qty-btn"
                  aria-label="Tăng"
                  :disabled="!row.is_available"
                  @click="increaseItem(row)"
                >
                  +
                </button>
              </div>
            </li>
          </ul>
        </div>
        <div class="cart-sheet-foot">
          <div class="cart-total-row">
            <span>Tạm tính</span>
            <strong>{{ formatVnd(selectedTotal) }}</strong>
          </div>
          <p class="cart-note muted">
            Giỏ chỉ lưu trên trình duyệt (theo bàn). Bấm xác nhận để gửi đơn cho bếp.
          </p>
          <div class="cart-sheet-actions">
            <button type="button" class="btn btn-secondary" @click="closeCart">
              Tiếp tục chọn
            </button>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="selectedItems.length === 0 || submitting"
              @click="submitOrder"
            >
              {{ submitting ? "Đang gửi..." : "Gửi đơn cho bếp" }}
            </button>
          </div>
        </div>
      </div>
      </div>
    </Teleport>
</template>

<script>
import { api } from "../api/api"
import { useRoute, useRouter } from "vue-router"
import { formatVnd } from "../utils/currency"
import {
  cartStorageKey as getCartStorageKey,
  consumeTableFreshSession,
  markTableVisitActive,
  isTableVisitActive,
} from "../utils/tableSession"
import "../css/TableMenu.css"

const SEARCH_DEBOUNCE_MS = 280
const HISTORY_POLL_MS = 4000

export default {
  setup() {
    const route = useRoute()
    const router = useRouter()
    const tableCode = Number(route.params.tableCode)
    return { tableCode, router }
  },

  data() {
    return {
      categories: [],
      menuCatalog: [],
      activeCategoryId: null,
      searchInput: "",
      searchQuery: "",
      searchDebounceId: null,

      catalogLoading: true,
      catalogError: "",

      itemCounts: {},
      cartOpen: false,

      historyOpen: false,
      historyLoading: false,
      historyPollTimer: null,
      orderHistory: [],

      submitting: false,
      toastMessage: "",
      toastClearId: null,

      paymentRequested: false,
      paymentRequesting: false,
      canRequestPayment: false,
      pendingKitchenCount: 0,

      redirectingToThanks: false
    }
  },

  computed: {
    searchActive() {
      return this.searchQuery.trim().length > 0
    },

    activeCategory() {
      return this.categories.find((c) => Number(c.id) === Number(this.activeCategoryId)) || null
    },

    visibleItems() {
      const q = this.searchQuery.trim().toLowerCase()
      let list = [...this.menuCatalog]

      if (q.length > 0) {
        return list.filter((item) => {
          const name = (item.name || "").toLowerCase()
          const desc = (item.description || "").toLowerCase()
          return name.includes(q) || desc.includes(q)
        })
      }

      return list.filter((item) => Number(item.category_id) === Number(this.activeCategoryId))
    },

    selectedItems() {
      return this.menuCatalog
        .map((item) => {
          const quantity = this.getItemCount(item.id)
          return {
            ...item,
            quantity,
            subtotal: Number(item.price || 0) * quantity
          }
        })
        .filter((item) => item.quantity > 0)
    },

    selectedTotal() {
      return this.selectedItems.reduce((sum, item) => sum + item.subtotal, 0)
    },

    cartItemCount() {
      return this.selectedItems.reduce((sum, item) => sum + item.quantity, 0)
    },

    emptyMessage() {
      if (this.searchActive) {
        return "Không tìm thấy món phù hợp. Thử từ khóa khác."
      }
      return "Danh mục này chưa có món."
    },

    cartStorageKey() {
      return getCartStorageKey(this.tableCode)
    },

    cartDockElevated() {
      return this.cartItemCount > 0
    },

    orderingLocked() {
      return this.paymentRequested
    },

    payDockTitle() {
      if (this.canRequestPayment) return ""
      if (this.pendingKitchenCount > 0) {
        return "Bếp đang chế biến — chưa thể gọi thanh toán"
      }
      return "Chưa có món cần thanh toán"
    }
  },

  watch: {
    paymentRequested(val) {
      if (val) this.cartOpen = false
    },

    itemCounts: {
      handler() {
        this.persistCart()
      },
      deep: true
    }
  },

  async mounted() {
    this.applyFreshSessionIfNeeded()
    this.bootstrapMenu()
    await this.fetchOrderHistory()
    await this.fetchPaymentRequestStatus()
    await this.fetchCheckoutStatus()
    this.startHistoryPoll()
    window.addEventListener("keydown", this.onGlobalKeydown)
  },

  beforeUnmount() {
    window.removeEventListener("keydown", this.onGlobalKeydown)
    this.stopHistoryPoll()
    if (this.searchDebounceId) clearTimeout(this.searchDebounceId)
    if (this.toastClearId) clearTimeout(this.toastClearId)
  },

  methods: {
    formatVnd,

    applyFreshSessionIfNeeded() {
      if (!consumeTableFreshSession(this.tableCode)) {
        this.restoreCart()
        return
      }
      this.itemCounts = {}
      this.paymentRequested = false
      this.paymentRequesting = false
      this.orderHistory = []
      this.historyOpen = false
      this.searchInput = ""
      this.searchQuery = ""
      this.cartOpen = false
      this.toastMessage = "Chào mừng! Bạn có thể bắt đầu gọi món."
      if (this.toastClearId) clearTimeout(this.toastClearId)
      this.toastClearId = setTimeout(() => {
        this.toastMessage = ""
      }, 3500)
    },

    formatOrderStatus(code) {
      const upper = (code || "").toString().toUpperCase()
      if (upper === "COMPLETED") return "Hoàn thành"
      if (upper === "PREPARING") return "Đang chuẩn bị"
      if (upper === "RECEIVED") return "Đã tiếp nhận"
      return ""
    },

    async bootstrapMenu() {
      this.catalogLoading = true
      this.catalogError = ""
      try {
        const [catRes, itemRes] = await Promise.all([
          api.get("/menu/categories"),
          api.get("/menu/items")
        ])
        this.categories = catRes.data || []
        this.menuCatalog = itemRes.data || []

        if (!this.categories.length) {
          this.catalogError = "Chưa có danh mục trong cơ sở dữ liệu."
          return
        }

        const preferred = this.categories.find((c) =>
          this.menuCatalog.some((m) => Number(m.category_id) === Number(c.id))
        )
        this.activeCategoryId = preferred
          ? preferred.id
          : this.categories[0].id
      } catch (err) {
        console.error(err)
        this.catalogError = "Không tải được thực đơn. Kiểm tra backend và kết nối mạng."
      } finally {
        this.catalogLoading = false
      }
    },

    selectCategory(id) {
      this.activeCategoryId = id
      this.clearSearch({ silent: true })
    },

    onSearchInput() {
      if (this.searchDebounceId) clearTimeout(this.searchDebounceId)
      this.searchDebounceId = setTimeout(() => {
        this.searchQuery = this.searchInput
      }, SEARCH_DEBOUNCE_MS)
    },

    clearSearch(opts = {}) {
      this.searchInput = ""
      this.searchQuery = ""
      if (!opts.silent) {
        this.showToast("Đã xóa bộ lọc tìm kiếm.")
      }
    },

    restoreCart() {
      try {
        const raw = sessionStorage.getItem(this.cartStorageKey)
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === "object") {
          const next = {}
          Object.keys(parsed).forEach((k) => {
            const n = Number(parsed[k])
            if (n > 0) next[k] = n
          })
          this.itemCounts = next
        }
      } catch (e) {
        console.warn("restoreCart", e)
      }
    },

    persistCart() {
      try {
        sessionStorage.setItem(this.cartStorageKey, JSON.stringify(this.itemCounts))
      } catch (e) {
        console.warn("persistCart", e)
      }
    },

    getItemCount(itemId) {
      return Number(this.itemCounts[itemId]) || 0
    },

    setItemCount(itemId, nextCount) {
      if (this.orderingLocked) return
      const n = Math.max(0, Math.floor(Number(nextCount) || 0))
      const next = { ...this.itemCounts }
      if (n === 0) {
        delete next[itemId]
      } else {
        next[itemId] = n
      }
      this.itemCounts = next
    },

    increaseItem(item) {
      if (this.orderingLocked || !item.is_available) return
      this.setItemCount(item.id, this.getItemCount(item.id) + 1)
    },

    decreaseItem(item) {
      if (this.orderingLocked) return
      const current = this.getItemCount(item.id)
      if (current <= 0) return
      this.setItemCount(item.id, current - 1)
    },

    openCart() {
      if (this.orderingLocked) return
      this.cartOpen = true
    },

    closeCart() {
      this.cartOpen = false
    },

    openCartAndFocusSubmit() {
      if (this.orderingLocked || this.cartItemCount === 0) return
      this.openCart()
    },

    onGlobalKeydown(e) {
      if (e.key === "Escape" && this.cartOpen) {
        this.closeCart()
      }
    },

    placeholderLetter(name) {
      const s = (name || "").trim()
      return s ? s.charAt(0).toUpperCase() : "?"
    },

    onImgError(e) {
      const el = e.target
      if (el && el.parentElement) {
        el.style.display = "none"
      }
    },

    async fetchOrderHistory(opts = {}) {
      const silent = opts.silent === true
      if (!silent) this.historyLoading = true
      try {
        const res = await api.get(`/orders/table/${this.tableCode}/history`)
        this.orderHistory = res.data || []
      } catch (err) {
        console.error(err)
      } finally {
        if (!silent) this.historyLoading = false
      }
    },

    startHistoryPoll() {
      this.stopHistoryPoll()
      this.historyPollTimer = window.setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return
        this.fetchOrderHistory({ silent: true })
        this.fetchPaymentRequestStatus()
        this.fetchCheckoutStatus()
      }, HISTORY_POLL_MS)
    },

    stopHistoryPoll() {
      if (this.historyPollTimer != null) {
        clearInterval(this.historyPollTimer)
        this.historyPollTimer = null
      }
    },

    async toggleHistory() {
      this.historyOpen = !this.historyOpen
      if (this.historyOpen) await this.fetchOrderHistory({ silent: true })
    },

    async fetchPaymentRequestStatus() {
      try {
        const res = await api.get(`/tables/${this.tableCode}/payment-request`)
        this.paymentRequested = Boolean(res.data?.payment_requested)
        this.canRequestPayment = Boolean(res.data?.can_request_payment)
        this.pendingKitchenCount = Number(res.data?.pending_kitchen_count || 0)
      } catch (err) {
        console.warn("fetchPaymentRequestStatus", err)
      }
    },

    async fetchCheckoutStatus() {
      if (
        this.redirectingToThanks ||
        !isTableVisitActive(this.tableCode)
      ) {
        return
      }
      try {
        const res = await api.get(`/tables/${this.tableCode}/checkout-status`)
        if (!res.data?.ready_for_guest_confirm) return
        this.redirectingToThanks = true
        this.router.replace(`/t/${this.tableCode}/cam-on`)
      } catch (err) {
        console.warn("fetchCheckoutStatus", err)
      }
    },

    async cancelPaymentRequest() {
      if (this.paymentRequesting) return
      this.paymentRequesting = true
      try {
        await api.delete(`/tables/${this.tableCode}/payment-request`)
        this.paymentRequested = false
        this.showToast("Đã hủy thanh toán. Bạn có thể tiếp tục gọi món.", 4000)
      } catch (err) {
        console.error(err)
        this.showToast("Không hủy được. Thử lại.", 4000)
      } finally {
        this.paymentRequesting = false
      }
    },

    async requestPayment() {
      if (this.paymentRequesting || this.paymentRequested) return
      if (!this.canRequestPayment) {
        const n = this.pendingKitchenCount
        if (n > 0) {
          this.showToast(
            n > 1
              ? `Bếp đang chế biến ${n} đơn. Vui lòng đợi món xong rồi mới gọi thanh toán.`
              : "Bếp đang chế biến món. Vui lòng đợi xong rồi mới gọi thanh toán.",
            5000
          )
        } else {
          this.showToast("Chưa có món nào cần thanh toán. Hãy gọi món trước.", 4500)
        }
        return
      }
      this.paymentRequesting = true
      try {
        await api.post(`/tables/${this.tableCode}/payment-request`)
        markTableVisitActive(this.tableCode)
        this.paymentRequested = true
        this.showToast("Đã gọi nhân viên thanh toán.", 4000)
      } catch (err) {
        console.error(err)
        const code = err?.response?.data?.error
        if (code === "NO_ORDERS_TO_PAY") {
          this.showToast("Chưa có món nào cần thanh toán. Hãy gọi món trước.", 4500)
        } else if (code === "ORDERS_STILL_IN_KITCHEN") {
          const n = Number(err?.response?.data?.pending_kitchen_count || 0)
          await this.fetchPaymentRequestStatus()
          this.showToast(
            n > 1
              ? `Bếp đang chế biến ${n} đơn. Chưa thể gọi thanh toán.`
              : "Bếp đang chế biến món. Chưa thể gọi thanh toán.",
            5000
          )
        } else if (!err?.response) {
          this.showToast("Không kết nối được máy chủ.", 4500)
        } else {
          this.showToast("Không gửi được yêu cầu. Thử lại.", 4500)
        }
      } finally {
        this.paymentRequesting = false
      }
    },

    showToast(msg, ms = 3200) {
      this.toastMessage = msg
      if (this.toastClearId) clearTimeout(this.toastClearId)
      this.toastClearId = setTimeout(() => {
        this.toastMessage = ""
      }, ms)
    },

    async submitOrder() {
      if (this.orderingLocked || this.submitting || this.selectedItems.length === 0) {
        return
      }

      this.submitting = true
      try {
        let orderId = null

        try {
          const activeRes = await api.get(`/orders/table/${this.tableCode}/active`)
          orderId = activeRes?.data?.order_id
        } catch (activeErr) {
          const errCode = activeErr?.response?.data?.error
          const status = activeErr?.response?.status
          if (status !== 404 && errCode !== "NO_ACTIVE_ORDER") {
            throw activeErr
          }
        }

        if (!orderId) {
          const createRes = await api.post("/orders", {
            table_id: this.tableCode
          })
          orderId = createRes?.data?.order_id
        }

        if (!orderId) {
          throw new Error("CREATE_ORDER_FAILED")
        }

        for (const row of this.selectedItems) {
          await api.post(`/orders/${orderId}/items`, {
            menu_item_id: row.id,
            quantity: row.quantity
          })
        }

        markTableVisitActive(this.tableCode)
        localStorage.setItem("orderId", orderId)
        sessionStorage.removeItem(this.cartStorageKey)
        this.itemCounts = {}
        await this.fetchOrderHistory({ silent: true })
        this.closeCart()
        this.showToast("Đã gửi đơn cho bếp.")
        this.$router.push(`/order/${orderId}`)
      } catch (err) {
        console.error(err)
        const code = err?.response?.data?.error
        if (!err?.response) {
          this.showToast(
            "Không kết nối được máy chủ. Kiểm tra backend (npm run dev) đang chạy.",
            5000
          )
        } else if (code === "TABLE_NOT_FOUND") {
          this.showToast("Bàn không tồn tại trong hệ thống. Kiểm tra dữ liệu bàn trong MySQL.", 5000)
        } else if (code === "ORDER_CLOSED") {
          this.showToast(
            "Đơn đã hoàn thành. Liên hệ nhân viên thanh toán hoặc đợi nhân viên mở đơn mới.",
            5500
          )
        } else if (code === "ORDER_IN_KITCHEN") {
          this.showToast(
            "Đơn đang chế biến — món mới sẽ vào lượt gọi tiếp theo. Gửi lại đơn.",
            5500
          )
        } else if (code === "ITEM_NOT_AVAILABLE") {
          this.showToast("Có món đã hết. Vui lòng bỏ món đó khỏi giỏ.", 4500)
        } else {
          this.showToast("Gửi đơn thất bại. Vui lòng thử lại.", 4500)
        }
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>
