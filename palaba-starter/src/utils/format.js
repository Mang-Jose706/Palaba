// Small display/format helpers shared by pages and the API layer.

/** Digits only: "0917 555 0142" → "09175550142". */
export function normalizeMobile(mobile = '') {
  return String(mobile).replace(/\D/g, '')
}

/** PH mobile: 11 digits starting with 09. */
export function isValidMobile(mobile) {
  return /^09\d{9}$/.test(normalizeMobile(mobile))
}

/** "09175550142" → "0917 555 0142". */
export function formatMobile(mobile = '') {
  const d = normalizeMobile(mobile)
  if (d.length !== 11) return mobile
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
}

/** "2026-11-08" for a Date (local time). */
export function toDateKey(date) {
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Parse "2026-11-08" as a local date (not UTC). */
export function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "Saturday, November 7" */
export function formatLongDay(date) {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

/** "Nov 7, 4:00 PM" */
export function formatDateTime(date) {
  const d = new Date(date)
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${formatTime(d)}`
}

/** "Nov 7" */
export function formatShortDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** "4:00 PM" */
export function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** Start of a time window: "1:00–3:00 PM" → "1:00 PM", "11:00–1:00 PM" → "11:00 AM". */
export function windowStartLabel(window = '') {
  const [start = '', end = ''] = window.split(/[–-]/).map((s) => s.trim())
  if (/AM|PM/i.test(start)) return start
  const endMeridiem = end.match(/AM|PM/i)?.[0]?.toUpperCase() ?? ''
  const startHour = Number(start.split(':')[0]) % 12
  const endHour = Number(end.split(':')[0]) % 12
  const meridiem = endMeridiem === 'PM' && startHour > endHour ? 'AM' : endMeridiem
  return `${start} ${meridiem}`.trim()
}

/** The next `count` days starting today (or `from`), as { value: 'YYYY-MM-DD', label } options. */
export function upcomingDays(count = 7, from = new Date()) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from)
    d.setDate(d.getDate() + i)
    const label = i === 0 ? `Today, ${formatShortDate(d)}` : i === 1 ? `Tomorrow, ${formatShortDate(d)}` : formatLongDay(d)
    return { value: toDateKey(d), label }
  })
}
