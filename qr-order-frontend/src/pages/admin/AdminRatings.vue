<template>
  <div class="admin-shell ratings-admin">
    <router-link to="/admin" class="admin-admin-back">← Về khu vực nhân viên</router-link>

    <header class="ratings-header">
      <h1>Đánh giá khách hàng</h1>
      <p class="ratings-sub">Phản hồi sau khi thanh toán. Tự cập nhật mỗi {{ POLL_MS / 1000 }} giây.</p>
      <p v-if="summary.count > 0" class="ratings-summary">
        {{ summary.count }} đánh giá — trung bình
        <strong>{{ summary.avg }}</strong> / 5 sao
      </p>
    </header>

    <p v-if="loading && !rows.length" class="ratings-muted">Đang tải…</p>
    <p v-else-if="errorMessage" class="ratings-error">{{ errorMessage }}</p>
    <p v-else-if="rows.length === 0" class="ratings-muted">Chưa có đánh giá nào.</p>

    <ul v-else class="ratings-list">
      <li v-for="row in rows" :key="row.id" class="ratings-card">
        <div class="ratings-card__head">
          <span class="ratings-stars" :aria-label="`${row.stars} sao`">
            <span
              v-for="n in 5"
              :key="n"
              class="ratings-star"
              :class="{ on: n <= row.stars }"
            >★</span>
          </span>
          <span class="ratings-meta">Bàn {{ row.table_id }} · {{ formatDate(row.created_at) }}</span>
        </div>
        <p v-if="row.comment" class="ratings-comment">{{ row.comment }}</p>
        <p v-else class="ratings-muted ratings-comment--empty">Không có góp ý thêm.</p>
      </li>
    </ul>
  </div>
</template>

<script>
import { api } from "../../api/api"
import "../../css/admin/admin-common.css"
import "../../css/admin/AdminRatings.css"

const POLL_MS = 8000

export default {
  data() {
    return {
      rows: [],
      loading: true,
      errorMessage: "",
      pollTimer: null,
      POLL_MS,
    }
  },

  computed: {
    summary() {
      if (!this.rows.length) return { count: 0, avg: "—" }
      const sum = this.rows.reduce((s, r) => s + Number(r.stars || 0), 0)
      const avg = (sum / this.rows.length).toFixed(1)
      return { count: this.rows.length, avg }
    },
  },

  mounted() {
    this.fetchRatings()
    this.pollTimer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return
      this.fetchRatings({ silent: true })
    }, POLL_MS)
  },

  beforeUnmount() {
    if (this.pollTimer) clearInterval(this.pollTimer)
  },

  methods: {
    formatDate(value) {
      if (!value) return "—"
      try {
        return new Date(value).toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      } catch {
        return String(value)
      }
    },

    async fetchRatings(opts = {}) {
      const silent = opts.silent === true
      if (!silent) this.loading = true
      try {
        const res = await api.get("/ratings")
        this.rows = res.data || []
        this.errorMessage = ""
      } catch (err) {
        console.error(err)
        this.errorMessage = "Không tải được đánh giá. Kiểm tra backend."
        if (!silent) this.rows = []
      } finally {
        if (!silent) this.loading = false
      }
    },
  },
}
</script>
