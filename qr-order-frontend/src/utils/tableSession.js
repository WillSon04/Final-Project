/** Khóa giỏ hàng theo bàn (sessionStorage). */
export function cartStorageKey(tableCode) {
  return `qr_cart_${tableCode}`
}

function visitStorageKey(tableCode) {
  return `qr_table_visit_${String(tableCode)}`
}

/** Đánh dấu lượt khách hiện tại (gọi món / gọi TT) — dùng trước khi xác nhận thanh toán. */
export function markTableVisitActive(tableCode) {
  sessionStorage.setItem(visitStorageKey(tableCode), "1")
}

export function isTableVisitActive(tableCode) {
  return sessionStorage.getItem(visitStorageKey(tableCode)) === "1"
}

export function clearTableVisitActive(tableCode) {
  sessionStorage.removeItem(visitStorageKey(tableCode))
}

/**
 * Reset trạng thái phía khách trên trình duyệt (lượt khách mới cùng bàn).
 */
export function resetTableGuestSession(tableCode) {
  const code = String(tableCode)
  sessionStorage.removeItem(cartStorageKey(code))
  clearTableVisitActive(code)
  localStorage.removeItem("orderId")
  sessionStorage.setItem(`qr_table_fresh_${code}`, "1")
}

/** TableMenu gọi khi mount — trả true nếu vừa reset sau đánh giá / kết thúc lượt. */
export function consumeTableFreshSession(tableCode) {
  const key = `qr_table_fresh_${String(tableCode)}`
  if (sessionStorage.getItem(key)) {
    sessionStorage.removeItem(key)
    return true
  }
  return false
}
