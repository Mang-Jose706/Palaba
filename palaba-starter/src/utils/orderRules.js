// Palaba order rules (CLAUDE.md business rules 2–7). Pure functions only —
// no React, no storage — so they can be tested and reused by the API layer.

import { formatPeso, orderTotal } from './pricing.js'

export const STATUSES = {
  pickup_scheduled: { label: 'Pickup scheduled', tone: 'info' },
  received: { label: 'Received', tone: 'neutral' },
  in_progress: { label: 'In progress', tone: 'info' },
  ready: { label: 'Ready', tone: 'success' },
  out_for_delivery: { label: 'Out for delivery', tone: 'info' },
  claimed: { label: 'Claimed', tone: 'neutral' },
  delivered: { label: 'Delivered', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
}

export function statusLabel(status) {
  return STATUSES[status]?.label ?? status
}

export const PAYMENT_OPTIONS = {
  drop_off: [
    { id: 'pay_now', label: 'Pay now' },
    { id: 'pay_at_pickup', label: 'Pay at pickup' },
  ],
  home_pickup: [
    { id: 'at_the_door', label: 'At the door' },
    { id: 'after_weighing', label: 'After weighing' },
    { id: 'on_delivery', label: 'On delivery' },
  ],
}

/**
 * Payment options allowed for a new order (rule 2). "On delivery" only makes
 * sense when the rider brings the laundry back home.
 */
export function paymentOptionsFor(type, returnMethod = 'shop_pickup') {
  const options = PAYMENT_OPTIONS[type] ?? []
  return options.filter((o) => o.id !== 'on_delivery' || returnMethod === 'home_delivery')
}

export function paymentOptionLabel(option) {
  const all = [...PAYMENT_OPTIONS.drop_off, ...PAYMENT_OPTIONS.home_pickup]
  return all.find((o) => o.id === option)?.label ?? option
}

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'gcash', label: 'GCash' },
  { id: 'maya', label: 'Maya' },
  { id: 'bank', label: 'Bank' },
]

export const CANNOT_CANCEL_MESSAGE =
  'Washing has started, so this order can no longer be cancelled.'

const TERMINAL = ['claimed', 'delivered', 'cancelled']

export function isPaid(order) {
  return Boolean(order.payment)
}

export function isWeighed(order) {
  return order.kg != null && order.kg > 0
}

export function isHomeDelivery(order) {
  return order.returnMethod === 'home_delivery'
}

export function isClosed(order) {
  return TERMINAL.includes(order.status)
}

/**
 * Rule 4: cancel only before washing starts — while `pickup_scheduled` or
 * `received`. From `in_progress` on, cancelling is not possible.
 */
export function canCancel(order) {
  return order.status === 'pickup_scheduled' || order.status === 'received'
}

/** Rule 2: release (mark claimed) only a ready, fully paid, shop-pickup order. */
export function canRelease(order) {
  return order.status === 'ready' && !isHomeDelivery(order) && isPaid(order)
}

/** Rule 2: mark delivered only when out for delivery and fully paid. */
export function canDeliver(order) {
  return order.status === 'out_for_delivery' && isPaid(order)
}

/** A payment can be recorded once, for the full amount, on a weighed, open order. */
export function canRecordPayment(order) {
  return !isPaid(order) && !isClosed(order) && isWeighed(order)
}

/**
 * Rule 4: show "Washing has started, so this order can no longer be cancelled."
 * from in_progress on, while the order is still open.
 */
export function showCannotCancel(order) {
  return !canCancel(order) && !isClosed(order) && order.status !== 'pickup_scheduled'
}

/**
 * Staff actions besides the one next-step button (Order details only):
 * - "Mark received at shop" when the laundry arrives without the rider app
 * - "Mark delivered" when the rider can't do it in the app (paid orders only, rule 2)
 */
export function otherStaffActions(order) {
  const actions = []
  if (order.status === 'pickup_scheduled') actions.push({ type: 'mark_received', label: 'Mark received at shop', to: 'received' })
  if (canDeliver(order)) actions.push({ type: 'mark_delivered', label: 'Mark delivered', to: 'delivered' })
  return actions
}

/** The rider's latest "not done" report, if it still applies to the current trip. */
export function openTripIssue(order) {
  if (!['pickup_scheduled', 'out_for_delivery'].includes(order.status)) return null
  const issue = order.tripIssues?.at(-1)
  if (!issue) return null
  const lastMove = order.history?.at(-1)?.at
  return !lastMove || issue.at >= lastMove ? issue : null
}

/** A received, unpaid order can still be corrected (service, bags; weight per canWeigh). */
export function canEditOrder(order) {
  return order.status === 'received' && !isPaid(order)
}

/** Pickup date/window can change until the rider picks it up; the rider can change until delivered. */
export function canReschedulePickup(order) {
  return order.status === 'pickup_scheduled'
}
export function canChangeRider(order) {
  return order.status === 'pickup_scheduled' || (isHomeDelivery(order) && ['received', 'in_progress', 'ready', 'out_for_delivery'].includes(order.status))
}

/**
 * Undo a status change made by mistake (rule 3, exception): only the LAST
 * change, only one step back, only when staff made it. A rider's pickup or
 * delivery, a cancellation, and an undo itself can't be undone.
 * @returns {{ from: string, to: string } | null}
 */
export function undoInfo(order) {
  const history = order.history ?? []
  if (history.length < 2) return null
  const last = history.at(-1)
  const prev = history.at(-2)
  if (last.status !== order.status || last.undo) return null
  if (['cancelled', 'pickup_scheduled'].includes(order.status)) return null
  if (typeof last.by === 'string' && last.by.startsWith('r-')) return null // rider action
  if (order.status === 'received' && (order.weighedBy === 'rider' || order.payment)) return null
  if (!statusPath(order).includes(prev.status)) return null
  if (statusPath(order).indexOf(prev.status) !== statusPath(order).indexOf(order.status) - 1) return null
  return { from: order.status, to: prev.status }
}

/** Remove a payment recorded by mistake: staff-recorded, before the laundry leaves the shop. */
export function canUndoPayment(order) {
  if (!isPaid(order) || order.payment.refundedAt) return false
  if (typeof order.payment.recordedBy === 'string' && order.payment.recordedBy.startsWith('r-')) return false
  return !['claimed', 'delivered', 'cancelled', 'out_for_delivery'].includes(order.status)
}

/** Rule 8 at the door: "At the door" must be weighed there; "On delivery" may be. */
export function riderMustWeigh(paymentOption) {
  return paymentOption === 'at_the_door'
}
export function riderMayWeigh(paymentOption) {
  return paymentOption === 'at_the_door' || paymentOption === 'on_delivery'
}

/** Rule 8: the rider's door weight is final — it can never be changed. */
export function canWeigh(order) {
  if (order.weighedBy === 'rider') return false
  return ['pickup_scheduled', 'received'].includes(order.status) && !isPaid(order)
}

/** Rule 3: allowed status moves. */
export function nextStatuses(order) {
  switch (order.status) {
    case 'pickup_scheduled':
      return ['received', 'cancelled']
    case 'received':
      return isWeighed(order) ? ['in_progress', 'cancelled'] : ['cancelled']
    case 'in_progress':
      return ['ready']
    case 'ready':
      return isHomeDelivery(order) ? ['out_for_delivery'] : ['claimed']
    case 'out_for_delivery':
      return ['delivered']
    default:
      return []
  }
}

export function canTransition(order, to) {
  if (!nextStatuses(order).includes(to)) return false
  if (to === 'cancelled') return canCancel(order)
  if (to === 'claimed') return canRelease(order)
  if (to === 'delivered') return canDeliver(order)
  return true
}

/**
 * The one next-step button for an order row (Dashboard behavior in CLAUDE.md).
 * Returns null when staff have nothing to do (the rider or customer acts next,
 * or the order is closed).
 * @returns {{ type: string, label: string, dialog: string|null } | null}
 */
export function nextAction(order) {
  switch (order.status) {
    case 'received':
      if (!isWeighed(order)) {
        return { type: 'weigh', label: 'Weigh order', dialog: 'weigh-pickup-order' }
      }
      return { type: 'start_washing', label: 'Start washing', dialog: 'change-status' }
    case 'in_progress':
      return { type: 'mark_ready', label: 'Mark ready', dialog: null }
    case 'ready':
      if (isHomeDelivery(order)) {
        return { type: 'send_out', label: 'Send out', dialog: 'change-status' }
      }
      if (!isPaid(order)) {
        return {
          type: 'collect',
          label: `Collect ${formatPeso(orderTotal(order))}`,
          dialog: 'record-payment',
        }
      }
      return { type: 'release', label: 'Release', dialog: 'mark-claimed' }
    default:
      return null
  }
}

/** "Ready for pickup" / "Ready for delivery" — the status label used on Order details. */
export function statusHeadline(order) {
  if (order.status === 'ready') return isHomeDelivery(order) ? 'Ready for delivery' : 'Ready for pickup'
  return statusLabel(order.status)
}

/**
 * The status path this order follows (rule 3):
 *   [pickup_scheduled →] received → in_progress → ready → claimed
 *   or … ready → out_for_delivery → delivered for home delivery.
 */
export function statusPath(order) {
  const path = order.type === 'home_pickup' ? ['pickup_scheduled', 'received'] : ['received']
  path.push('in_progress', 'ready')
  if (isHomeDelivery(order)) path.push('out_for_delivery', 'delivered')
  else path.push('claimed')
  return path
}

/**
 * Steps for the Order details tracker, matching the REAL status.
 * Each step: { status, label, state: 'done'|'current'|'upcoming', at }.
 * A cancelled order shows the steps it reached as done and stops there.
 */
export function statusSteps(order) {
  const path = statusPath(order)
  const history = order.history ?? []
  const reachedAt = (status) => [...history].reverse().find((h) => h.status === status)?.at ?? null

  let currentIndex = path.indexOf(order.status)
  if (order.status === 'cancelled') {
    // Last step that was reached before cancelling.
    currentIndex = path.reduce((last, s, i) => (reachedAt(s) ? i : last), 0)
  }
  return path.map((status, i) => ({
    status,
    label: statusLabel(status),
    state:
      order.status === 'cancelled'
        ? i <= currentIndex
          ? 'done'
          : 'upcoming'
        : i < currentIndex
          ? 'done'
          : i === currentIndex
            ? 'current'
            : 'upcoming',
    at: i <= currentIndex ? reachedAt(status) : null,
  }))
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days since the order became ready (0 if not ready). */
export function daysSinceReady(order, now = new Date()) {
  if (order.status !== 'ready' || !order.readyAt) return 0
  const ms = new Date(now).getTime() - new Date(order.readyAt).getTime()
  return Math.max(0, Math.floor(ms / DAY_MS))
}

/**
 * Rule 7: a Ready order older than the owner's setting (default 3 days) is unclaimed.
 * @param {object} order
 * @param {{ unclaimedAfterDays?: number }} [settings]
 * @param {Date} [now]
 */
export function isUnclaimed(order, settings = {}, now = new Date()) {
  // Only orders the customer must come and claim (not ones waiting for delivery).
  if (order.status !== 'ready' || !order.readyAt || isHomeDelivery(order)) return false
  const limit = settings.unclaimedAfterDays ?? 3
  const ms = new Date(now).getTime() - new Date(order.readyAt).getTime()
  return ms > limit * DAY_MS
}

/** "Unclaimed 4 days", or null when the order is not unclaimed. */
export function unclaimedLabel(order, settings, now = new Date()) {
  if (!isUnclaimed(order, settings, now)) return null
  const days = daysSinceReady(order, now)
  return `Unclaimed ${days} ${days === 1 ? 'day' : 'days'}`
}

/** Rule 6: "Paid" or "Unpaid · ₱175 due". */
export function paymentLabel(order) {
  if (isPaid(order)) return 'Paid'
  const total = orderTotal(order)
  if (total == null) return 'Unpaid · not weighed yet'
  return `Unpaid · ${formatPeso(total)} due`
}
