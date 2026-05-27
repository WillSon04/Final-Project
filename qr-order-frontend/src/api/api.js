import axios from "axios"

const baseURL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  (import.meta.env.DEV ? "/api" : "http://localhost:3000/api")

export const api = axios.create({
  baseURL,
  timeout: 15000,
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      err.message = "Không kết nối được máy chủ. Kiểm tra backend đang chạy."
    }
    return Promise.reject(err)
  }
)
