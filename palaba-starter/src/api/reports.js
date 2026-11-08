// Owner reports (mock). Never includes SMS costs (rule 5).

import { orderTotal } from '../utils/pricing.js'
import { PAYMENT_METHODS, isClosed, isPaid, isUnclaimed, unclaimedLabel } from '../utils/orderRules.js'
import { toDateKey } from '../utils/format.js'
import { getData, respond } from './store.js'

/** Payments that count as money collected (not refunded). */
function collected(orders) {
  return orders.filter((o) => o.payment && !o.payment.refundedAt)
}

/**
 * @param {Date} [now]
 * @returns report numbers for the Reports page
 */
export async function getReport(now = new Date()) {
  const { orders, customers, settings } = getData()
  const todayKey = toDateKey(now)
  const paid = collected(orders)

  // Last 7 days, oldest first, today last.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (6 - i))
    const key = toDateKey(d)
    const list = paid.filter((o) => toDateKey(o.payment.paidAt) === key)
    return {
      key,
      date: d.toISOString(),
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      total: list.reduce((s, o) => s + o.payment.amount, 0),
      count: list.length,
      isToday: key === todayKey,
    }
  })
  const today = days[days.length - 1]

  const todayPaid = paid.filter((o) => toDateKey(o.payment.paidAt) === todayKey)
  const byMethod = PAYMENT_METHODS.map((m) => ({
    id: m.id,
    label: m.label,
    total: todayPaid.filter((o) => o.payment.method === m.id).reduce((s, o) => s + o.payment.amount, 0),
  }))

  // Open, unpaid shop-pickup orders with a known amount: money still to collect at the counter.
  const toCollect = orders
    .filter((o) => !isClosed(o) && !isPaid(o) && o.returnMethod !== 'home_delivery' && orderTotal(o) != null)
    .map((o) => ({
      id: o.id,
      status: o.status,
      customerName: customers.find((c) => c.id === o.customerId)?.name ?? '',
      amount: orderTotal(o),
      unclaimed: isUnclaimed(o, settings, now),
      unclaimedLabel: unclaimedLabel(o, settings, now),
    }))
    .sort((a, b) => a.id.localeCompare(b.id))

  return respond({
    collectedToday: today.total,
    paymentsToday: today.count,
    last7Days: days.reduce((s, d) => s + d.total, 0),
    range: { from: days[0].date, to: today.date },
    days,
    byMethod,
    toCollect,
    toCollectTotal: toCollect.reduce((s, o) => s + o.amount, 0),
    unclaimedCount: orders.filter((o) => isUnclaimed(o, settings, now)).length,
    unclaimedAfterDays: settings.unclaimedAfterDays,
  })
}
