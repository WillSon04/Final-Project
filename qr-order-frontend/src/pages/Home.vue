<template>
  <div class="home-page">
    <header class="home-hero">
      <h1>Hệ thống đặt món QR</h1>
      <p>Quét mã QR tại bàn hoặc chọn bàn bên dưới để mở thực đơn.</p>
      <p v-if="lanHint" class="home-lan-hint">{{ lanHint }}</p>
    </header>

    <section class="home-tables" aria-label="Danh sách bàn">
      <h2 class="home-section-title">Chọn bàn ({{ TABLE_COUNT }} bàn)</h2>
      <div class="home-grid">
        <article v-for="id in tableIds" :key="id" class="home-table-card">
          <h3>Bàn {{ id }}</h3>
          <img
            v-if="qrByTable[id]"
            :src="qrByTable[id]"
            :alt="`QR đặt món bàn ${id}`"
            class="home-qr"
            width="160"
            height="160"
          />
          <p v-else class="home-qr-loading">Đang tạo mã QR…</p>
          <p class="home-table-url">{{ tableUrl(id) }}</p>
          <router-link :to="`/t/${id}`" class="home-btn">Mở thực đơn</router-link>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue"
import QRCode from "qrcode"
import { TABLE_COUNT, tableIds } from "../config/tables.js"
import { getPublicOrigin } from "../utils/publicOrigin.js"
import "../css/Home.css"

const qrByTable = ref({})

const publicOrigin = computed(() => getPublicOrigin())

const lanHint = computed(() => {
  const origin = publicOrigin.value
  if (!origin) return ""
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return "Demo điện thoại: trên máy chạy ipconfig, mở http://<IPv4-WiFi>:5173 rồi quét QR (không cần sửa .env)."
  }
  return `Điện thoại cùng WiFi: quét mã QR bên dưới (${origin}).`
})

function tableUrl(id) {
  return `${publicOrigin.value}/t/${id}`
}

onMounted(async () => {
  const next = {}
  for (const id of tableIds) {
    try {
      next[id] = await QRCode.toDataURL(tableUrl(id), { width: 160, margin: 1 })
    } catch (e) {
      console.warn("QR bàn", id, e)
    }
  }
  qrByTable.value = next
})
</script>
