// Palaba pricing — the ONE place prices are calculated (CLAUDE.md rule 1).
//
// - Price is per washing session. One session holds up to 7 kg.
// - Weight is rounded UP to the whole kg.
// - Each kg over 7 adds 1/7 of the session price.
//   Example: 10 kg wash, dry & fold = 175 + 3 × 25 = ₱250.
// - Pickup fee and delivery fee are flat amounts from Settings.

export const SESSION_KG = 7

export const SERVICES = {
  wash_dry: { id: 'wash_dry', label: 'Wash & dry' },
  wash_dry_fold: { id: 'wash_dry_fold', label: 'Wash, dry & fold' },
}

export function serviceLabel(service) {
  return SERVICES[service]?.label ?? service
}

/** Rounds a weight up to the whole kg. 6.2 → 7, 7 → 7. null/0 stays null (not weighed yet). */
export function roundKg(kg) {
  if (kg == null || Number.isNaN(Number(kg)) || Number(kg) <= 0) return null
  // Trim floating-point noise (e.g. 7.000000001) before rounding up.
  return Math.ceil(Math.round(Number(kg) * 1000) / 1000)
}

/** Number of washing sessions (7 kg each) a weight needs. */
export function sessionsFor(kg) {
  const billableKg = roundKg(kg)
  return billableKg == null ? 0 : Math.ceil(billableKg / SESSION_KG)
}

/** Price of each kg over 7: 1/7 of the session price (₱175 → ₱25). */
export function extraKgPrice(sessionPrice) {
  return Number(sessionPrice) / SESSION_KG
}

/** Laundry cost only (no fees). Returns null when the order is not weighed yet. */
export function laundryPrice(kg, sessionPrice) {
  const billableKg = roundKg(kg)
  if (billableKg == null) return null
  const extraKg = Math.max(0, billableKg - SESSION_KG)
  return Math.round(sessionPrice + extraKg * extraKgPrice(sessionPrice))
}

/**
 * Flat pickup and delivery fees for an order.
 * @param {{ pickup?: boolean, delivery?: boolean }} options
 * @param {{ pickupFee: number, deliveryFee: number }} settings
 */
export function fees({ pickup = false, delivery = false } = {}, settings = {}) {
  const pickupFee = pickup ? Number(settings.pickupFee ?? 0) : 0
  const deliveryFee = delivery ? Number(settings.deliveryFee ?? 0) : 0
  return { pickupFee, deliveryFee, total: pickupFee + deliveryFee }
}

/**
 * Full price breakdown.
 * @param {object} input
 * @param {number|null} input.kg          measured weight (null = not weighed yet)
 * @param {number} input.sessionPrice     price of one 7 kg session for the chosen service
 * @param {boolean} [input.pickup]        home pickup → adds pickup fee
 * @param {boolean} [input.delivery]      home delivery → adds delivery fee
 * @param {number} [input.pickupFee]
 * @param {number} [input.deliveryFee]
 * @returns {{ billableKg, sessions, extraKg, perExtraKg, laundry, pickupFee, deliveryFee, fees, total }}
 *          laundry and total are null until the order is weighed.
 */
export function computePrice({
  kg,
  sessionPrice,
  pickup = false,
  delivery = false,
  pickupFee = 0,
  deliveryFee = 0,
}) {
  const billableKg = roundKg(kg)
  const laundry = laundryPrice(kg, sessionPrice)
  const f = fees({ pickup, delivery }, { pickupFee, deliveryFee })
  return {
    billableKg,
    sessions: sessionsFor(kg),
    extraKg: billableKg == null ? 0 : Math.max(0, billableKg - SESSION_KG),
    perExtraKg: extraKgPrice(sessionPrice),
    laundry,
    pickupFee: f.pickupFee,
    deliveryFee: f.deliveryFee,
    fees: f.total,
    total: laundry == null ? null : laundry + f.total,
  }
}

/**
 * Price of a stored order. Orders keep a snapshot of the prices that applied
 * when they were created (order.rates), so changing Settings later does not
 * change old orders.
 */
export function orderPrice(order) {
  const rates = order.rates ?? {}
  return computePrice({
    kg: order.kg,
    sessionPrice: rates.sessionPrice ?? 0,
    pickup: order.type === 'home_pickup',
    delivery: order.returnMethod === 'home_delivery',
    pickupFee: rates.pickupFee ?? 0,
    deliveryFee: rates.deliveryFee ?? 0,
  })
}

/** Amount the customer must pay in full, or null if not weighed yet. */
export function orderTotal(order) {
  return orderPrice(order).total
}

/** Rates snapshot for a new order, taken from Settings. */
export function ratesFromSettings(service, settings) {
  return {
    sessionPrice: Number(settings.prices?.[service] ?? 0),
    pickupFee: Number(settings.pickupFee ?? 0),
    deliveryFee: Number(settings.deliveryFee ?? 0),
  }
}

/** ₱1,250 */
export function formatPeso(amount) {
  if (amount == null) return '—'
  return `₱${Math.round(amount).toLocaleString('en-PH')}`
}
