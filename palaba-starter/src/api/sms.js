// SMS stub (CLAUDE.md rule 5). In the front end a text is only logged to the
// console. The real back end will send it through Semaphore.
//
// Texts go out only when the customer must act. Each kind can be switched off
// in Settings; "order_received" and "washing_started" are OFF by default.

import { formatPeso, orderTotal, roundKg } from '../utils/pricing.js'
import { getData, mutate } from './store.js'

export const TEXT_KINDS = {
  ready_for_pickup: 'Ready for pickup',
  pickup_scheduled: 'Pickup scheduled',
  out_for_delivery: 'Out for delivery',
  amount_after_weighing: 'Amount after weighing',
  order_received: 'Order received',
  washing_started: 'Washing started',
}

export function trackingLink(order) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/t/${order.trackingCode}`
}

function messageFor(kind, order, shopName, shopPhone = '') {
  const link = trackingLink(order)
  const due = formatPeso(orderTotal(order))
  switch (kind) {
    case 'ready_for_pickup':
      return order.payment
        ? `${shopName}: Your laundry ${order.id} is ready for pickup. It's paid. Track: ${link}`
        : `${shopName}: Your laundry ${order.id} is ready for pickup. Amount due: ${due}. Track: ${link}`
    case 'pickup_scheduled':
      return `${shopName}: Pickup for ${order.id} is set on ${order.pickup?.date}, ${order.pickup?.window}. Track: ${link}`
    case 'out_for_delivery':
      return order.payment
        ? `${shopName}: Your laundry ${order.id} is on the way. Track: ${link}`
        : `${shopName}: Your laundry ${order.id} is on the way. Please prepare ${due}. Track: ${link}`
    case 'amount_after_weighing':
      return `${shopName}: Your laundry ${order.id} weighs ${roundKg(order.kg)} kg. Amount due: ${due}. Please pay by GCash or Maya to ${shopPhone}. Track: ${link}`
    case 'order_received':
      return `${shopName}: We received your laundry ${order.id}. Track: ${link}`
    case 'washing_started':
      return `${shopName}: We started washing ${order.id}. Track: ${link}`
    default:
      return ''
  }
}

/**
 * Rule 5 in ONE place: which text (if any) an event triggers.
 * Events: 'created', 'weighed_by_staff', or a new status
 * ('received', 'in_progress', 'ready', 'out_for_delivery').
 * Returns the text kind, or null when no text belongs to that event.
 * Whether it is actually sent also depends on the Settings switch.
 */
export function textKindFor(order, event) {
  switch (event) {
    case 'created':
      return order.type === 'home_pickup' ? 'pickup_scheduled' : 'order_received'
    case 'weighed_by_staff':
      return order.paymentOption === 'after_weighing' ? 'amount_after_weighing' : null
    case 'received':
      return 'order_received'
    case 'in_progress':
      return 'washing_started'
    case 'ready':
      // Home deliveries get their text when the rider leaves, not at Ready.
      return order.returnMethod === 'home_delivery' ? null : 'ready_for_pickup'
    case 'out_for_delivery':
      return 'out_for_delivery'
    default:
      return null
  }
}

/** The text kind that WILL go out for this event (switch on), or null. */
export function textToSend(order, event) {
  const kind = textKindFor(order, event)
  return kind && isTextEnabled(kind) ? kind : null
}

/** The exact text a customer would get (for previews in dialogs). */
export function previewOrderText(kind, order) {
  const data = getData()
  return messageFor(kind, order, data.settings.shopName || 'Your laundry shop', data.settings.shopPhone)
}

/** Is this kind of text switched on in Settings? */
export function isTextEnabled(kind) {
  return Boolean(getData().settings.texts?.[kind])
}

/**
 * Send a text about an order if that text kind is switched on in Settings.
 * @returns {Promise<{ sent: boolean, to?: string, message?: string }>}
 */
export async function sendOrderText(kind, order) {
  const data = getData()
  if (!data.settings.texts?.[kind]) return { sent: false }
  const customer = data.customers.find((c) => c.id === order.customerId)
  if (!customer?.mobile) return { sent: false }
  const message = messageFor(kind, order, data.settings.shopName || 'Your laundry shop', data.settings.shopPhone)
  console.log(`[SMS stub] ${TEXT_KINDS[kind]} → ${customer.mobile}: ${message}`)
  const entry = { kind, to: customer.mobile, at: new Date().toISOString() }
  mutate((d) => {
    const o = d.orders.find((x) => x.id === order.id)
    if (o) o.texts = [...(o.texts ?? []), entry]
  })
  return { sent: true, ...entry, message }
}
