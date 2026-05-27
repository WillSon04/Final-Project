/** URL gốc cho QR và link chia sẻ (ưu tiên VITE_PUBLIC_ORIGIN khi dev trên LAN). */
export function getPublicOrigin() {
  const configured = import.meta.env.VITE_PUBLIC_ORIGIN?.replace(/\/$/, "")
  if (configured) return configured
  if (typeof window !== "undefined") return window.location.origin
  return ""
}
