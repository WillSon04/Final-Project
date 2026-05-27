<template>
  <div class="admin-hub">
    <header class="admin-hub__head">
      <p class="admin-hub__eyebrow">Lẩu Manwah</p>
      <h1>Khu vực nhân viên</h1>
      <p class="admin-hub__sub">Chọn màn hình làm việc. Trang này không dành cho khách quét QR.</p>
    </header>

    <nav class="admin-hub__grid" aria-label="Chức năng nhân viên">
      <router-link to="/admin/kitchen" class="admin-hub__card admin-hub__card--kitchen">
        <span class="admin-hub__icon" aria-hidden="true">👨‍🍳</span>
        <h2>Bếp</h2>
        <p>Nhận đơn, chế biến và hoàn thành món theo từng bàn.</p>
      </router-link>

      <router-link to="/admin/cashier" class="admin-hub__card admin-hub__card--cashier">
        <span class="admin-hub__icon" aria-hidden="true">💳</span>
        <h2>Thu ngân</h2>
        <p>Xem bill gộp, xử lý yêu cầu thanh toán và thu tiền.</p>
      </router-link>

      <router-link to="/admin/ratings" class="admin-hub__card admin-hub__card--ratings">
        <span class="admin-hub__icon" aria-hidden="true">★</span>
        <h2>Đánh giá</h2>
        <p>Xem phản hồi và điểm sao sau khi khách dùng bữa.</p>
      </router-link>
    </nav>

    <p class="admin-hub__foot">
      <router-link to="/" class="admin-hub__guest-link">← Trang QR khách</router-link>
    </p>
  </div>
</template>

<script setup>
import "../../css/admin/admin-common.css"
import "../../css/admin/AdminHub.css"
</script>
