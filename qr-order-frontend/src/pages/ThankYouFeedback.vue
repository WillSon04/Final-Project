<template>

  <div class="feedback-page">

    <header class="feedback-hero">

      <p class="feedback-brand">Lẩu Manwah</p>

      <h1>Cảm ơn quý khách!</h1>

      <p class="feedback-lead">

        Cảm ơn quý khách đã sử dụng dịch vụ cửa hàng <strong>Lẩu Manwah</strong>.

      </p>

    </header>



    <section v-if="!submitted" class="feedback-card">

      <h2>Đánh giá dịch vụ</h2>

      <p class="feedback-sub">Mong quý khách dành chút thời gian để góp ý cho chúng tôi.</p>



      <div class="star-row" role="radiogroup" aria-label="Điểm đánh giá">

        <button

          v-for="n in 5"

          :key="n"

          type="button"

          class="star-btn"

          :class="{ active: n <= stars }"

          :aria-label="`${n} sao`"

          @click="stars = n"

        >

          ★

        </button>

      </div>



      <label class="feedback-label">

        Góp ý thêm (không bắt buộc)

        <textarea

          v-model.trim="comment"

          rows="3"

          maxlength="500"

          placeholder="Chất lượng món, phục vụ, không gian..."

        />

      </label>



      <p v-if="submitError" class="feedback-error">{{ submitError }}</p>



      <button

        type="button"

        class="btn-submit"

        :disabled="stars < 1 || submitting"

        @click="submitRating"

      >

        {{ submitting ? "Đang gửi…" : "Gửi đánh giá" }}

      </button>

    </section>



    <section v-else class="feedback-card feedback-card--done">

      <p class="feedback-success">Cảm ơn quý khách đã gửi đánh giá!</p>

      <p class="feedback-redirect muted">Đang mở thực đơn cho lượt khách tiếp theo…</p>

    </section>

  </div>

</template>



<script setup>

import { ref } from "vue"

import { useRoute, useRouter } from "vue-router"

import { api } from "../api/api"

import { resetTableGuestSession } from "../utils/tableSession"

import "../css/ThankYouFeedback.css"



const route = useRoute()

const router = useRouter()

const tableCode = Number(route.params.tableCode)



const stars = ref(0)

const comment = ref("")

const submitting = ref(false)

const submitted = ref(false)

const submitError = ref("")



const REDIRECT_MS = 1800



async function submitRating() {

  if (stars.value < 1 || submitting.value || submitted.value) return

  submitting.value = true

  submitError.value = ""

  try {

    await api.post(`/tables/${tableCode}/ratings`, {

      stars: stars.value,

      comment: comment.value,

    })

    submitted.value = true

    resetTableGuestSession(tableCode)

    window.setTimeout(() => {

      router.replace(`/t/${tableCode}`)

    }, REDIRECT_MS)

  } catch (err) {

    console.error(err)

    submitError.value = err?.message || "Không gửi được đánh giá. Thử lại sau."

  } finally {

    submitting.value = false

  }

}

</script>


