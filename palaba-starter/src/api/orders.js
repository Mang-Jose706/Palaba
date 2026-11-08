// Orders API (mock). Every function is async so it can later be replaced by
// fetch() calls to the Express back end without touching components.
// All business rules are checked here using src/utils — never trust the UI.

import { formatPeso, orderPrice, orderTotal, ratesFromSettings, roundKg, sessionsFor, SERVICES } from '../utils/pricing.js'
import {
  PAYMENT_METHODS,
  PAYMENT_OPTIONS,
  paymentOptionsFor,
  canCancel,
  canRecordPayment,
  canTransition,
  canWeigh,
  canChangeRider,
  canEditOrder,
  canReschedulePickup,
  canUndoPayment,
  isUnclaimed,
  undoInfo,
  statusSteps,
} from '../utils/orderRules.js'
import { getData, mutate, newId, respond, snapshot } from './store.js'
import { isValidMobile, normalizeMobile } from '../utils/format.js'
import { sendOrderText, textKindFor, textToSend } from './sms.js'

// ── helpers ───────────────────────────────────────────────────────────

function withCustomer(data, order) {
  const customer = data.customers.find((c) => c.id === order.customerId) ?? null
  const rider = order.riderId ? data.riders.find((r) => r.id === order.riderId) ?? null : null
  return { ...order, customer, rider, price: orderPrice(order) }
}

function findOrder(data, id) {
  const order = data.orders.find((o) => o.id === id)
  if (!order) throw new Error(`Order ${id} not found`)
  return order
}

function isSameDay(iso, now = new Date()) {
  if (!iso) return false
  const d = new Date(iso)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function nextOrderId(data) {
  const max = data.orders.reduce((m, o) => Math.max(m, Number(o.id.replace(/\D/g, '')) || 0), 1000)
  return `LT-${max + 1}`
}

function newTrackingCode() {
  return Math.random().toString(36).slice(2, 8).padEnd(6, '0')
}


// ── reads ─────────────────────────────────────────────────────────────

/**
 * @param {{ status?: string|string[], type?: string, customerId?: string, search?: string }} [filters]
 */
export async function listOrders(filters = {}) {
  const data = getData()
  const statuses = filters.status ? [].concat(filters.status) : null
  const q = filters.search?.trim().toLowerCase()
  const list = data.orders
    .filter((o) => !statuses || statuses.includes(o.status))
    .filter((o) => !filters.type || o.type === filters.type)
    .filter((o) => !filters.customerId || o.customerId === filters.customerId)
    .map((o) => withCustomer(data, o))
    .filter((o) => {
      if (!q) return true
      const digits = q.replace(/\D/g, '')
      return (
        o.id.toLowerCase().includes(q) ||
        o.customer?.name.toLowerCase().includes(q) ||
        (digits.length >= 3 && normalizeMobile(o.customer?.mobile).includes(digits))
      )
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return respond(list)
}

export async function getOrder(id) {
  const data = getData()
  return respond(withCustomer(data, findOrder(data, id)))
}

/**
 * Public tracking page /t/:code (no login). Returns ONLY what the customer may
 * see — first name, status steps WITHOUT times, price, payment state and how to
 * reach the shop. No mobile numbers, no staff names, no timestamps.
 */
export async function getOrderByTrackingCode(code) {
  const data = getData()
  const order = data.orders.find((o) => o.trackingCode === code)
  if (!order) throw new Error('Order not found')
  const customer = data.customers.find((c) => c.id === order.customerId)
  const rider = order.riderId ? data.riders.find((r) => r.id === order.riderId) : null
  return respond({
    id: order.id,
    status: order.status,
    type: order.type,
    returnMethod: order.returnMethod,
    service: order.service,
    kg: order.kg,
    paymentOption: order.paymentOption,
    paid: Boolean(order.payment) && !order.payment.refundedAt,
    paymentMethod: order.payment?.method ?? null,
    rates: order.rates,
    price: orderPrice(order),
    steps: statusSteps(order).map(({ status, state }) => ({ status, state })),
    pickupDate: order.status === 'pickup_scheduled' ? order.pickup?.date ?? null : null,
    // Rule 5: only promise a text the shop will really send.
    textsOn: { ready: Boolean(textToSend(order, 'ready')), onTheWay: Boolean(textToSend(order, 'out_for_delivery')) },
    customerFirstName: customer?.name.split(' ')[0] ?? '',
    riderFirstName: rider?.name.split(' ')[0] ?? null,
    shop: { name: data.settings.shopName, phone: data.settings.shopPhone, address: data.settings.shopAddress },
  })
}

/** Shop name and number for public pages (e.g. a tracking link that doesn't work). */
export async function getShopContact() {
  const { settings } = getData()
  return respond({ name: settings.shopName, phone: settings.shopPhone, address: settings.shopAddress })
}

/** Dashboard tab counts and summary cards. */
export async function getDashboardSummary(now = new Date()) {
  const { orders, settings } = getData()
  const count = (s) => orders.filter((o) => o.status === s).length
  const washedToday = orders.filter((o) => isSameDay(o.startedAt, now) && o.status !== 'cancelled')
  return respond({
    tabs: {
      to_start: count('received'),
      processing: count('in_progress'),
      ready: count('ready'),
      on_the_way: count('pickup_scheduled') + count('out_for_delivery'),
    },
    todaysOrders: orders.filter((o) => isSameDay(o.createdAt, now)).length,
    unclaimedOrders: orders.filter((o) => isUnclaimed(o, settings, now)).length,
    kilosWashedToday: washedToday.reduce((sum, o) => sum + (roundKg(o.kg) ?? 0), 0),
    sessionsToday: washedToday.reduce((sum, o) => sum + sessionsFor(o.kg), 0),
    collectedToday: orders
      .filter((o) => o.payment && !o.payment.refundedAt && isSameDay(o.payment.paidAt, now))
      .reduce((sum, o) => sum + o.payment.amount, 0),
  })
}

// ── writes ────────────────────────────────────────────────────────────

/**
 * Create a drop-off or home-pickup order.
 * @param {object} input
 * @param {'drop_off'|'home_pickup'} input.type
 * @param {string} [input.customerId]  existing customer, or pass input.customer to create one
 * @param {{ name, mobile, address?, landmark? }} [input.customer]
 * @param {'wash_dry'|'wash_dry_fold'} input.service
 * @param {number} [input.kg]          required for drop-off
 * @param {number} [input.bags]
 * @param {'shop_pickup'|'home_delivery'} [input.returnMethod]
 * @param {string} input.paymentOption
 * @param {{ method, reference? }} [input.payment]  required when paymentOption is "pay_now"
 * @param {{ date, window, address, landmark? }} [input.pickup]  required for home pickup
 * @param {string} [input.riderId]
 * @param {string} [input.notes]
 * @param {string} [input.promisedAt]  drop-off: when the customer was told to come back (ISO)
 */
export async function createOrder(input) {
  const { type, service, paymentOption } = input
  if (!PAYMENT_OPTIONS[type]) throw new Error('Choose drop-off or home pickup')
  if (!SERVICES[service]) throw new Error('Choose a service')
  if (!paymentOptionsFor(type, input.returnMethod ?? 'shop_pickup').some((p) => p.id === paymentOption)) {
    throw new Error('Choose when the customer will pay')
  }
  if (type === 'drop_off' && !roundKg(input.kg)) throw new Error('Enter the weight')
  if (type === 'home_pickup' && (!input.pickup?.date || !input.pickup?.window || !input.pickup?.address)) {
    throw new Error('Enter the pickup date, time window and address')
  }
  if (paymentOption === 'pay_now' && !PAYMENT_METHODS.some((m) => m.id === input.payment?.method)) {
    throw new Error('Choose a payment method')
  }

  const created = mutate((data) => {
    let customerId = input.customerId
    if (!customerId) {
      const c = input.customer
      if (!c?.name?.trim() || !c?.mobile?.trim()) throw new Error('Enter the customer name and mobile number')
      if (!isValidMobile(c.mobile)) throw new Error('Enter an 11-digit mobile number starting with 09')
      const mobile = normalizeMobile(c.mobile)
      const existing = data.customers.find((x) => normalizeMobile(x.mobile) === mobile)
      if (existing) {
        customerId = existing.id
      } else {
        customerId = newId('c')
        data.customers.push({
          id: customerId,
          name: c.name.trim(),
          mobile,
          address: c.address ?? input.pickup?.address ?? '',
          landmark: c.landmark ?? input.pickup?.landmark ?? '',
          createdAt: new Date().toISOString(),
        })
      }
    }

    const now = new Date().toISOString()
    const status = type === 'home_pickup' ? 'pickup_scheduled' : 'received'
    const order = {
      id: nextOrderId(data),
      trackingCode: newTrackingCode(),
      customerId,
      type,
      returnMethod: input.returnMethod ?? 'shop_pickup',
      service,
      rates: ratesFromSettings(service, data.settings),
      kg: type === 'drop_off' ? Number(input.kg) : null,
      weighedBy: type === 'drop_off' ? 'staff' : null,
      bags: Number(input.bags ?? 1),
      paymentOption,
      payment: null,
      status,
      riderId: type === 'home_pickup' ? input.riderId ?? null : null,
      pickup: type === 'home_pickup' ? { landmark: '', ...input.pickup } : null,
      notes: input.notes ?? '',
      promisedAt: type === 'drop_off' ? input.promisedAt ?? null : null,
      texts: [],
      createdAt: now,
      startedAt: null,
      readyAt: null,
      closedAt: null,
      cancelReason: null,
      history: [{ status, at: now }],
    }
    if (paymentOption === 'pay_now') {
      // Rule 2: full payment only.
      order.payment = {
        method: input.payment.method,
        reference: input.payment.reference ?? '',
        amount: orderTotal(order),
        paidAt: now,
        recordedBy: input.by ?? null,
      }
    }
    data.orders.push(order)
    return order
  })

  const kind = textKindFor(created, 'created') // drop-off: "Order received", OFF by default
  if (kind) await sendOrderText(kind, created)
  return getOrder(created.id)
}

/** Move an order to a new status, enforcing rules 2–4. Sends texts per rule 5. */
export async function changeStatus(id, to, { by = null } = {}) {
  const updated = mutate((data) => {
    const order = findOrder(data, id)
    if (!canTransition(order, to)) {
      if (to === 'cancelled') throw new Error('Washing has started, so this order can no longer be cancelled.')
      if (to === 'claimed' || to === 'delivered') throw new Error('This order must be paid in full first.')
      throw new Error(`Can't change ${order.id} from ${order.status} to ${to}`)
    }
    const now = new Date().toISOString()
    order.status = to
    if (to === 'in_progress') order.startedAt = now
    if (to === 'ready') order.readyAt = now
    if (['claimed', 'delivered', 'cancelled'].includes(to)) order.closedAt = now
    order.history = [...(order.history ?? []), { status: to, at: now, by }]
    return snapshot(order)
  })

  const kind = textKindFor(updated, to)
  if (kind) await sendOrderText(kind, updated)
  return getOrder(id)
}

export const startWashing = (id, opts) => changeStatus(id, 'in_progress', opts)
export const markReady = (id, opts) => changeStatus(id, 'ready', opts)
export const sendOutForDelivery = (id, opts) => changeStatus(id, 'out_for_delivery', opts)
export const markClaimed = (id, opts) => changeStatus(id, 'claimed', opts)
export const markDelivered = (id, opts) => changeStatus(id, 'delivered', opts)
/** Rider brought the laundry to the shop (or staff received a home pickup). */
export const markPickedUp = (id, opts) => changeStatus(id, 'received', opts)

/** Rule 4: cancel only while `received`. */
/**
 * Rule 4: cancel only before washing starts (pickup scheduled or received). If the customer already paid, staff
 * must confirm they returned the full amount (`refunded: true`).
 * @param {{ reason: string, note?: string, refunded?: boolean, by?: string }} input
 */
export async function cancelOrder(id, { reason, note = '', refunded = false, by = null } = {}) {
  const order = findOrder(getData(), id)
  if (!canCancel(order)) {
    throw new Error('Washing has started, so this order can no longer be cancelled.')
  }
  if (!reason?.trim()) throw new Error('Choose a reason')
  if (order.payment && !refunded) {
    throw new Error(`Return the ${formatPeso(order.payment.amount)} to the customer before cancelling.`)
  }
  mutate((d) => {
    const o = findOrder(d, id)
    o.cancelReason = reason.trim()
    o.cancelNote = note.trim()
    if (o.payment) o.payment = { ...o.payment, refundedAt: new Date().toISOString(), refundedBy: by }
  })
  return changeStatus(id, 'cancelled', { by })
}

/**
 * Undo the last status change (made by staff by mistake). No text is sent,
 * and texts already sent can't be taken back.
 */
export async function undoLastStatus(id, { by = null } = {}) {
  mutate((data) => {
    const order = findOrder(data, id)
    const undo = undoInfo(order)
    if (!undo) throw new Error('This status change can’t be undone.')
    const now = new Date().toISOString()
    order.status = undo.to
    // Clear what the undone step set.
    if (undo.from === 'in_progress') order.startedAt = null
    if (undo.from === 'ready') order.readyAt = null
    if (['claimed', 'delivered'].includes(undo.from)) order.closedAt = null
    if (undo.from === 'received') order.pickedUpAt = null
    order.history = [...order.history, { status: undo.to, at: now, by, undo: true, undid: undo.from }]
  })
  return getOrder(id)
}

/** Remove a payment recorded by mistake (see canUndoPayment). */
export async function undoPayment(id, { by = null } = {}) {
  mutate((data) => {
    const order = findOrder(data, id)
    if (!canUndoPayment(order)) throw new Error('This payment can’t be removed.')
    order.removedPayments = [...(order.removedPayments ?? []), { ...order.payment, removedAt: new Date().toISOString(), removedBy: by }]
    order.payment = null
  })
  return getOrder(id)
}

/**
 * Rule 2: record the FULL payment. No partial payments, no balances.
 * @param {{ method: 'cash'|'gcash'|'maya'|'bank', reference?: string, amount?: number, by?: string }} payment
 */
export async function recordPayment(id, { method, reference = '', amount, by = null }) {
  mutate((data) => {
    const order = findOrder(data, id)
    if (!canRecordPayment(order)) throw new Error('This order cannot take a payment right now.')
    if (!PAYMENT_METHODS.some((m) => m.id === method)) throw new Error('Choose a payment method')
    const total = orderTotal(order)
    if (amount != null && Number(amount) !== total) {
      throw new Error('Full payment only — the amount must match the total.')
    }
    order.payment = { method, reference, amount: total, paidAt: new Date().toISOString(), recordedBy: by }
  })
  return getOrder(id)
}

/**
 * Set the weight of a home-pickup order.
 * Rule 8: once the rider weighs at the door, that weight is final.
 * @param {{ by: 'rider'|'staff' }} opts
 */
export async function weighOrder(id, kg, { by = 'staff', bags } = {}) {
  if (!roundKg(kg)) throw new Error('Enter the weight')
  const updated = mutate((data) => {
    const order = findOrder(data, id)
    if (!canWeigh(order)) throw new Error("This order's weight can no longer be changed.")
    order.kg = Number(kg)
    order.weighedBy = by
    order.weighedAt = new Date().toISOString()
    if (bags != null) order.bags = Number(bags)
    return snapshot(order)
  })
  const kind = by === 'staff' ? textKindFor(updated, 'weighed_by_staff') : null
  if (kind) await sendOrderText(kind, updated)
  return getOrder(id)
}

/**
 * Edit notes, bags, pickup date/window or rider. Status, price and payment have
 * their own functions. Pickup changes only before the rider picks it up; rider
 * changes only while a trip is still ahead.
 */
export async function updateOrder(id, patch) {
  mutate((data) => {
    const order = findOrder(data, id)
    if ('pickup' in patch) {
      if (!canReschedulePickup(order)) throw new Error('This pickup is already done.')
      const p = { ...order.pickup, ...patch.pickup }
      if (!p.date || !p.window || !p.address?.trim()) throw new Error('Enter the pickup date, time window and address')
      order.pickup = p
    }
    if ('riderId' in patch) {
      if (!canChangeRider(order)) throw new Error("This order's rider can't be changed now.")
      const rider = data.riders.find((r) => r.id === patch.riderId)
      if (!rider || !rider.active) throw new Error('Choose an active rider')
      order.riderId = rider.id
    }
    if ('bags' in patch) {
      if (!(Number(patch.bags) >= 1)) throw new Error('Enter the number of bags')
      order.bags = Number(patch.bags)
    }
    if ('notes' in patch) order.notes = String(patch.notes ?? '')
  })
  return getOrder(id)
}

/**
 * Correct a received, unpaid order: service (re-priced from today's Settings),
 * bags, and the weight when it can still change (rule 8: not a rider's weight).
 */
export async function editOrder(id, { service, kg, bags }) {
  mutate((data) => {
    const order = findOrder(data, id)
    if (!canEditOrder(order)) throw new Error('Only received, unpaid orders can be edited.')
    if (service && service !== order.service) {
      if (!SERVICES[service]) throw new Error('Choose a service')
      order.service = service
      order.rates = ratesFromSettings(service, data.settings)
    }
    if (kg != null && kg !== '' && Number(kg) !== order.kg) {
      if (!canWeigh(order)) throw new Error("This order's weight can no longer be changed.")
      if (!roundKg(kg)) throw new Error('Enter the weight')
      order.kg = Number(kg)
      order.weighedBy = 'staff'
      order.weighedAt = new Date().toISOString()
    }
    if (bags != null && bags !== '') {
      if (!(Number(bags) >= 1)) throw new Error('Enter the number of bags')
      order.bags = Number(bags)
    }
  })
  return getOrder(id)
}
