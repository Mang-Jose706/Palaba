// Short labels for order lists (Orders table, Customers, Reports).

import { fromDateKey, formatShortDate, formatTime, toDateKey } from './format.js'

/** "Drop-off" / "Pickup only" / "Pickup + delivery" */
export function howLabel(order) {
  if (order.type === 'drop_off') return order.returnMethod === 'home_delivery' ? 'Drop-off + delivery' : 'Drop-off'
  return order.returnMethod === 'home_delivery' ? 'Pickup + delivery' : 'Pickup only'
}

/** "Today" / "Tomorrow" / "Nov 7" */
function dayWord(date, now) {
  const key = toDateKey(date)
  if (key === toDateKey(now)) return 'Today'
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (key === toDateKey(tomorrow)) return 'Tomorrow'
  return formatShortDate(date)
}

/** "today, 5:00 PM" / "Nov 7, 2:00 PM" (time only for today when `timeOnlyToday`) */
function when(iso, now, { timeOnlyToday = false } = {}) {
  const d = new Date(iso)
  const day = dayWord(d, now)
  if (timeOnlyToday && day === 'Today') return formatTime(d)
  return `${day === 'Today' || day === 'Tomorrow' ? day.toLowerCase() : day}, ${formatTime(d)}`
}

/**
 * The time that matters for the order's current status:
 *   pickup_scheduled → "Today, 3:00–5:00 PM"
 *   received / in_progress → "Due Nov 7, 2:00 PM" (promised pickup)
 *   ready → "Ready 8:45 AM" / "Ready Nov 2"
 *   out_for_delivery → "Left at 10:30 AM"
 *   claimed / delivered / cancelled → "Claimed Nov 5"
 */
export function timeLabel(order, now = new Date()) {
  const lastAt = (status) => [...(order.history ?? [])].reverse().find((h) => h.status === status)?.at
  switch (order.status) {
    case 'pickup_scheduled':
      return order.pickup?.date ? `${dayWord(fromDateKey(order.pickup.date), now)}, ${order.pickup.window}` : 'Pickup scheduled'
    case 'received':
    case 'in_progress':
      return order.promisedAt ? `Due ${when(order.promisedAt, now)}` : `Received ${formatShortDate(order.createdAt)}`
    case 'ready': {
      if (!order.readyAt) return 'Ready'
      const d = new Date(order.readyAt)
      return dayWord(d, now) === 'Today' ? `Ready ${formatTime(d)}` : `Ready ${formatShortDate(d)}`
    }
    case 'out_for_delivery': {
      const at = lastAt('out_for_delivery')
      return at ? `Left at ${when(at, now, { timeOnlyToday: true })}` : 'Out for delivery'
    }
    case 'claimed':
      return `Claimed ${formatShortDate(order.closedAt ?? order.createdAt)}`
    case 'delivered':
      return `Delivered ${formatShortDate(order.closedAt ?? order.createdAt)}`
    case 'cancelled':
      return `Cancelled ${formatShortDate(order.closedAt ?? order.createdAt)}`
    default:
      return ''
  }
}
