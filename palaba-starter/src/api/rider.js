// Rider API (mock): today's trips, pickups at the door, deliveries, problems.
// Business rules come from src/utils; the API enforces them.

import { orderPrice, orderTotal, roundKg } from '../utils/pricing.js'
import { isPaid, paymentOptionsFor, riderMayWeigh, riderMustWeigh } from '../utils/orderRules.js'
import { toDateKey } from '../utils/format.js'
import { getData, mutate, respond, snapshot } from './store.js'
import { getOrder, changeStatus } from './orders.js'

/** Payment methods a rider can take at the door. */
export const RIDER_PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'gcash', label: 'GCash' },
  { id: 'maya', label: 'Maya' },
]

function withPeople(data, o) {
  return {
    ...o,
    customer: data.customers.find((c) => c.id === o.customerId) ?? null,
    rider: data.riders.find((r) => r.id === o.riderId) ?? null,
    price: orderPrice(o),
  }
}

function findRiderOrder(data, id, riderId) {
  const order = data.orders.find((o) => o.id === id)
  if (!order) throw new Error(`Order ${id} not found`)
  if (riderId && order.riderId !== riderId) throw new Error('This trip is not assigned to you.')
  return order
}

/** "1:00–3:00 PM" → minutes since midnight of the start, for sorting. */
export function windowStart(window = '') {
  const [start = '', end = ''] = window.split(/[–-]/)
  const m = start.match(/(\d{1,2}):(\d{2})/)
  if (!m) return 0
  const startHour = Number(m[1]) % 12
  const endHour = Number(end.match(/(\d{1,2})/)?.[1] ?? 0) % 12
  let pm = /PM/i.test(start) || (!/AM/i.test(start) && /PM/i.test(end))
  // "11:00–1:00 PM": the start is still in the morning.
  if (!/AM|PM/i.test(start) && /PM/i.test(end) && startHour > endHour) pm = false
  return (startHour + (pm ? 12 : 0)) * 60 + Number(m[2])
}

/**
 * Everything the rider's "Today's trips" page needs.
 * - now: deliveries on the way
 * - later: today's scheduled pickups, earliest first
 * - done: pickups and deliveries finished today
 */
export async function getRiderDay(riderId, now = new Date()) {
  const data = getData()
  const today = toDateKey(now)
  const mine = data.orders.filter((o) => o.riderId === riderId).map((o) => withPeople(data, o))

  const nowTrips = mine.filter((o) => o.status === 'out_for_delivery')
  const later = mine
    // Today's pickups plus overdue ones (e.g. "try again" after a missed pickup).
    .filter((o) => o.status === 'pickup_scheduled' && o.pickup?.date && o.pickup.date <= today)
    .map((o) => ({ ...o, overdue: o.pickup.date < today }))
    .sort((a, b) => a.pickup.date.localeCompare(b.pickup.date) || windowStart(a.pickup.window) - windowStart(b.pickup.window))
  const done = mine.filter(
    (o) =>
      (o.status === 'delivered' && o.closedAt && toDateKey(o.closedAt) === today) ||
      (o.pickedUpAt && toDateKey(o.pickedUpAt) === today),
  )

  return respond({
    now: nowTrips,
    later,
    done,
    toCollectOnDelivery: nowTrips.filter((o) => !isPaid(o)).reduce((s, o) => s + (orderTotal(o) ?? 0), 0),
    doorPayments: later.filter((o) => o.paymentOption === 'at_the_door').length,
    pickups: later.length,
    nextPickupWindow: later[0]?.pickup?.window ?? null,
    tripCount: nowTrips.length + later.length,
  })
}

/** One of the rider's own trips. */
export async function getRiderTrip(id, riderId) {
  const data = getData()
  return respond(withPeople(data, findRiderOrder(data, id, riderId)))
}

/** The rider tapped Call: keep a record so the shop can see attempts. */
export async function logRiderCall(id, riderId) {
  mutate((data) => {
    const o = findRiderOrder(data, id, riderId)
    o.calls = [...(o.calls ?? []), { at: new Date().toISOString(), by: riderId }]
  })
  return respond(true)
}

/**
 * Finish a pickup at the door and mark it picked up (status → received).
 * - "At the door": weight + FULL payment are required. That weight is final (rule 8).
 * - "On delivery": weighing at the door is optional (if weighed, it is final).
 * - "After weighing": staff weigh it at the shop; the rider does not weigh.
 * The customer may switch payment option at the door (rule 2 options only).
 *
 * @param {{ riderId, paymentOption, kg?, method?, bags?, note? }} input
 */
export async function completePickup(id, { riderId, paymentOption, kg, method, bags, note = '' }) {
  const before = findRiderOrder(getData(), id, riderId)
  if (before.status !== 'pickup_scheduled') throw new Error('This pickup is already done.')
  if (!paymentOptionsFor('home_pickup', before.returnMethod).some((p) => p.id === paymentOption)) {
    throw new Error('Choose how the customer will pay')
  }
  const weighs = riderMustWeigh(paymentOption) || (riderMayWeigh(paymentOption) && roundKg(kg))
  if (riderMustWeigh(paymentOption)) {
    if (!roundKg(kg)) throw new Error('Enter the weight from the hanging scale')
    if (!RIDER_PAYMENT_METHODS.some((m) => m.id === method)) throw new Error('Choose how the customer paid')
  }
  if (bags != null && !(Number(bags) >= 1)) throw new Error('Enter the number of bags')

  mutate((data) => {
    const o = findRiderOrder(data, id, riderId)
    const now = new Date().toISOString()
    o.paymentOption = paymentOption
    if (weighs) {
      o.kg = Number(kg)
      o.weighedBy = 'rider'
      o.weighedAt = now
    }
    if (bags != null) o.bags = Number(bags)
    if (note.trim()) o.notes = [o.notes, `Rider: ${note.trim()}`].filter(Boolean).join('\n')
    if (paymentOption === 'at_the_door') {
      // Rule 2: full payment only — the amount is always the computed total.
      o.payment = { method, reference: '', amount: orderTotal(o), paidAt: now, recordedBy: riderId }
    }
    o.pickedUpAt = now
  })
  return changeStatus(id, 'received', { by: riderId })
}

/** Record the FULL payment at the door on delivery (rule 2). */
export async function recordDeliveryPayment(id, { riderId, method }) {
  if (!RIDER_PAYMENT_METHODS.some((m) => m.id === method)) throw new Error('Choose how the customer paid')
  mutate((data) => {
    const o = findRiderOrder(data, id, riderId)
    if (o.status !== 'out_for_delivery') throw new Error('This order is not out for delivery.')
    if (isPaid(o)) throw new Error('This order is already paid.')
    o.payment = { method, reference: '', amount: orderTotal(o), paidAt: new Date().toISOString(), recordedBy: riderId }
  })
  return getOrder(id)
}

/** Mark delivered — refused while unpaid (rule 2, enforced in changeStatus too). */
export async function completeDelivery(id, { riderId }) {
  findRiderOrder(getData(), id, riderId)
  return changeStatus(id, 'delivered', { by: riderId })
}

/**
 * The rider couldn't finish a trip. The shop sees it on the order. No text is
 * sent to the customer (rule 5: texts only when the customer must act); the
 * shop contacts them.
 * @param {{ riderId, reason, nextStep?: 'try_later'|'shop_will_call', note? }} input
 */
export async function reportTripProblem(id, { riderId, reason, nextStep = 'shop_will_call', note = '' }) {
  if (!reason?.trim()) throw new Error('Choose what happened')
  const updated = mutate((data) => {
    const o = findRiderOrder(data, id, riderId)
    if (!['pickup_scheduled', 'out_for_delivery'].includes(o.status)) throw new Error('This trip is already done.')
    o.tripIssues = [
      ...(o.tripIssues ?? []),
      {
        trip: o.status === 'pickup_scheduled' ? 'pickup' : 'delivery',
        reason: reason.trim(),
        nextStep,
        note: note.trim(),
        at: new Date().toISOString(),
        by: riderId,
      },
    ]
    return snapshot(o)
  })
  return respond(updated)
}
