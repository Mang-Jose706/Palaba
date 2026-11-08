// Mock data for Palaba. Dates are relative to "now" so Today, Unclaimed and
// Today's trips always have something to show. The API layer (src/api/) copies
// this into localStorage on first load; components never import it directly.

import { ratesFromSettings } from '../utils/pricing.js'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

function at(daysAgo, hour = 9, minute = 0) {
  const d = new Date(Date.now() - daysAgo * DAY)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function dateOnly(daysFromToday = 0) {
  const d = new Date(Date.now() + daysFromToday * DAY)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const settings = {
  shopName: 'Palaba Laundry',
  shopPhone: '0917 555 0123',
  shopAddress: '45 Rizal Ave., Poblacion',
  prices: {
    wash_dry: 140,
    wash_dry_fold: 175,
  },
  pickupFee: 50,
  deliveryFee: 50,
  unclaimedAfterDays: 3,
  pickupWindows: ['9:00–11:00 AM', '1:00–3:00 PM', '3:00–5:00 PM'],
  // Rule 5: texts only when the customer must act. The last two are OFF by default.
  texts: {
    ready_for_pickup: true,
    pickup_scheduled: true,
    out_for_delivery: true,
    amount_after_weighing: true,
    order_received: false,
    washing_started: false,
  },
}

export const customers = [
  { id: 'c-01', name: 'Rosa Lim', mobile: '09171234501', address: '8 Luna St., Poblacion', landmark: 'beside the bakery', createdAt: at(60) },
  { id: 'c-02', name: 'Marites Dizon', mobile: '09171234502', address: '12 Mabini St., Poblacion', landmark: 'green gate', createdAt: at(45) },
  { id: 'c-03', name: 'Joy Santiago', mobile: '09171234503', address: 'Purok 3, San Isidro', landmark: 'near the chapel, blue gate', createdAt: at(30) },
  { id: 'c-04', name: 'Kevin Lao', mobile: '09171234504', address: 'Blk 5 Lot 2, Villa Verde', landmark: '', createdAt: at(28) },
  { id: 'c-05', name: 'Liza Manalo', mobile: '09171234505', address: '22 Bonifacio St.', landmark: 'across the school', createdAt: at(20) },
  { id: 'c-06', name: 'Paolo Cruz', mobile: '09171234506', address: '3 Del Pilar St.', landmark: '', createdAt: at(18) },
  { id: 'c-07', name: 'Grace Villanueva', mobile: '09171234507', address: 'Phase 2, Camella Homes', landmark: 'corner house', createdAt: at(12) },
  { id: 'c-08', name: 'Ramon Garcia', mobile: '09171234508', address: '17 Aguinaldo St.', landmark: 'sari-sari store', createdAt: at(7) },
  { id: 'c-09', name: 'Nina Torres', mobile: '09171234509', address: '5 Quezon Blvd.', landmark: '', createdAt: at(3) },
]

// Staff and owner sign in on the desktop/phone app; riders sign in at /rider.
// Mock passwords only — the real back end will hash them.
export const staff = [
  { id: 'u-01', role: 'owner', name: 'Ana Reyes', mobile: '09181110001', username: 'ana', password: 'palaba123', active: true },
  { id: 'u-02', role: 'staff', name: 'Bea Santos', mobile: '09181110002', username: 'bea', password: 'palaba123', active: true },
  { id: 'u-03', role: 'staff', name: 'Carlo Mendoza', mobile: '09181110003', username: 'carlo', password: 'palaba123', active: false },
]

export const riders = [
  { id: 'r-01', role: 'rider', name: 'Arnel Pascual', mobile: '09191110001', username: 'arnel', password: 'palaba123', active: true },
  { id: 'r-02', role: 'rider', name: 'Jun Bautista', mobile: '09191110002', username: 'jun', password: 'palaba123', active: true },
]

function order({ service = 'wash_dry_fold', ...o }) {
  return {
    notes: '',
    bags: 1,
    kg: null,
    weighedBy: null,
    riderId: null,
    pickup: null,
    payment: null,
    readyAt: null,
    closedAt: null,
    cancelReason: null,
    ...o,
    service,
    rates: ratesFromSettings(service, settings),
  }
}

const pay = (method, paidAtIso, amount, reference = '') => ({ method, amount, paidAt: paidAtIso, reference, recordedBy: 'u-02' })

export const orders = [
  // ── pickup_scheduled ──────────────────────────────────────────────
  order({
    id: 'LT-1052', trackingCode: 'k7m2qx', customerId: 'c-03',
    type: 'home_pickup', returnMethod: 'home_delivery', paymentOption: 'at_the_door',
    status: 'pickup_scheduled', riderId: 'r-01',
    pickup: { date: dateOnly(0), window: '1:00–3:00 PM', address: 'Purok 3, San Isidro', landmark: 'near the chapel, blue gate' },
    createdAt: at(1, 16, 20),
  }),
  order({
    id: 'LT-1053', trackingCode: 'p3v8ns', customerId: 'c-04', service: 'wash_dry',
    type: 'home_pickup', returnMethod: 'shop_pickup', paymentOption: 'after_weighing',
    status: 'pickup_scheduled', riderId: 'r-01',
    pickup: { date: dateOnly(0), window: '3:00–5:00 PM', address: 'Blk 5 Lot 2, Villa Verde', landmark: '' },
    createdAt: at(0, 8, 5),
  }),

  // ── received (To start) ───────────────────────────────────────────
  order({
    id: 'LT-1050', trackingCode: 'h4c9tz', customerId: 'c-05',
    type: 'drop_off', returnMethod: 'shop_pickup', paymentOption: 'pay_now',
    status: 'received', kg: 6.4, weighedBy: 'staff', bags: 2,
    payment: pay('cash', at(0, 8, 40), 175),
    createdAt: at(0, 8, 40),
  }),
  order({
    id: 'LT-1051', trackingCode: 'w2r6jd', customerId: 'c-06', service: 'wash_dry',
    type: 'drop_off', returnMethod: 'shop_pickup', paymentOption: 'pay_at_pickup',
    status: 'received', kg: 9.2, weighedBy: 'staff',
    createdAt: at(0, 9, 15),
  }),
  order({
    id: 'LT-1049', trackingCode: 'm8q1lb', customerId: 'c-07',
    type: 'home_pickup', returnMethod: 'home_delivery', paymentOption: 'after_weighing',
    status: 'received', riderId: 'r-02', bags: 2,
    pickup: { date: dateOnly(0), window: '9:00–11:00 AM', address: 'Phase 2, Camella Homes', landmark: 'corner house' },
    notes: 'Separate the whites, please.',
    createdAt: at(1, 17, 0),
  }),

  // ── in_progress (Processing) ──────────────────────────────────────
  order({
    id: 'LT-1047', trackingCode: 'z5n3fy', customerId: 'c-08',
    type: 'drop_off', returnMethod: 'shop_pickup', paymentOption: 'pay_at_pickup',
    status: 'in_progress', kg: 10, weighedBy: 'staff', bags: 2,
    createdAt: at(0, 7, 50),
  }),
  order({
    id: 'LT-1046', trackingCode: 'b6t4kw', customerId: 'c-09', service: 'wash_dry',
    type: 'home_pickup', returnMethod: 'home_delivery', paymentOption: 'on_delivery',
    status: 'in_progress', kg: 5, weighedBy: 'staff', riderId: 'r-02',
    pickup: { date: dateOnly(-1), window: '1:00–3:00 PM', address: '5 Quezon Blvd.', landmark: '' },
    createdAt: at(1, 10, 0),
  }),

  // ── ready ─────────────────────────────────────────────────────────
  order({
    id: 'LT-1038', trackingCode: 'r9d2gh', customerId: 'c-01',
    type: 'drop_off', returnMethod: 'shop_pickup', paymentOption: 'pay_at_pickup',
    status: 'ready', kg: 6, weighedBy: 'staff', bags: 2,
    readyAt: at(0, 10, 30),
    createdAt: at(1, 9, 0),
  }),
  order({
    id: 'LT-1045', trackingCode: 'f1x7cv', customerId: 'c-05', service: 'wash_dry',
    type: 'drop_off', returnMethod: 'shop_pickup', paymentOption: 'pay_now',
    status: 'ready', kg: 7, weighedBy: 'staff',
    payment: pay('gcash', at(1, 11, 5), 140, '1009 223 4456'),
    readyAt: at(0, 9, 45),
    createdAt: at(1, 11, 5),
  }),
  order({
    // Ready 5 days ago and still here → "Unclaimed 5 days"
    id: 'LT-1031', trackingCode: 'u4e8ma', customerId: 'c-06',
    type: 'drop_off', returnMethod: 'shop_pickup', paymentOption: 'pay_at_pickup',
    status: 'ready', kg: 12.3, weighedBy: 'staff', bags: 3,
    readyAt: at(5, 15, 0),
    createdAt: at(6, 9, 30),
  }),
  order({
    id: 'LT-1044', trackingCode: 'd7s5pe', customerId: 'c-02',
    type: 'home_pickup', returnMethod: 'home_delivery', paymentOption: 'on_delivery',
    status: 'ready', kg: 8, weighedBy: 'rider', riderId: 'r-01',
    pickup: { date: dateOnly(-1), window: '9:00–11:00 AM', address: '12 Mabini St., Poblacion', landmark: 'green gate' },
    readyAt: at(0, 8, 0),
    createdAt: at(2, 16, 0),
  }),

  // ── out_for_delivery ──────────────────────────────────────────────
  order({
    id: 'LT-1043', trackingCode: 'g2y6wr', customerId: 'c-07',
    type: 'home_pickup', returnMethod: 'home_delivery', paymentOption: 'at_the_door',
    status: 'out_for_delivery', kg: 7.5, weighedBy: 'rider', riderId: 'r-01',
    pickup: { date: dateOnly(-2), window: '1:00–3:00 PM', address: 'Phase 2, Camella Homes', landmark: 'corner house' },
    payment: pay('cash', at(2, 13, 40), 300),
    readyAt: at(1, 16, 0),
    createdAt: at(3, 9, 0),
  }),

  // ── delivered ─────────────────────────────────────────────────────
  order({
    id: 'LT-1040', trackingCode: 'n5j3qa', customerId: 'c-02', service: 'wash_dry',
    type: 'home_pickup', returnMethod: 'home_delivery', paymentOption: 'after_weighing',
    status: 'delivered', kg: 4.2, weighedBy: 'staff', riderId: 'r-02',
    pickup: { date: dateOnly(-4), window: '9:00–11:00 AM', address: '12 Mabini St., Poblacion', landmark: 'green gate' },
    payment: pay('maya', at(4, 14, 10), 240, 'MY-889120'),
    readyAt: at(3, 15, 0),
    closedAt: at(3, 17, 30),
    createdAt: at(5, 8, 30),
  }),

  // ── claimed ───────────────────────────────────────────────────────
  order({
    id: 'LT-1042', trackingCode: 'c8h1zt', customerId: 'c-08',
    type: 'drop_off', returnMethod: 'shop_pickup', paymentOption: 'pay_at_pickup',
    status: 'claimed', kg: 3.5, weighedBy: 'staff',
    payment: pay('cash', at(0, 8, 15), 175),
    readyAt: at(1, 15, 0),
    closedAt: at(0, 8, 15),
    createdAt: at(2, 10, 0),
  }),
  order({
    id: 'LT-1036', trackingCode: 'e3k9vb', customerId: 'c-01', service: 'wash_dry',
    type: 'home_pickup', returnMethod: 'shop_pickup', paymentOption: 'at_the_door',
    status: 'claimed', kg: 14, weighedBy: 'rider', riderId: 'r-02', bags: 2,
    pickup: { date: dateOnly(-5), window: '3:00–5:00 PM', address: '8 Luna St., Poblacion', landmark: 'beside the bakery' },
    payment: pay('bank', at(5, 15, 30), 330, 'BPI-55128'),
    readyAt: at(4, 16, 0),
    closedAt: at(3, 10, 0),
    createdAt: at(6, 12, 0),
  }),

  // ── cancelled ─────────────────────────────────────────────────────
  order({
    id: 'LT-1048', trackingCode: 'a6w2xs', customerId: 'c-04',
    type: 'drop_off', returnMethod: 'shop_pickup', paymentOption: 'pay_at_pickup',
    status: 'cancelled', kg: 5, weighedBy: 'staff',
    cancelReason: 'Customer changed their mind',
    closedAt: at(1, 12, 0),
    createdAt: at(1, 11, 30),
  }),
]

// startedAt (washing started) and a simple status history, derived from the timestamps above.
for (const o of orders) {
  if (o.readyAt) o.startedAt = new Date(new Date(o.readyAt).getTime() - 2 * HOUR).toISOString()
  else if (o.status === 'in_progress') o.startedAt = at(0, 9, 30)
  else o.startedAt = null

  // Drop-offs: customer was told to come back the next day at 4:00 PM.
  if (o.type === 'drop_off') {
    const promised = new Date(o.createdAt)
    promised.setDate(promised.getDate() + 1)
    promised.setHours(16, 0, 0, 0)
    o.promisedAt = promised.toISOString()
  } else {
    o.promisedAt = null
  }
  o.texts = []

  o.history = [{ status: o.type === 'home_pickup' ? 'pickup_scheduled' : 'received', at: o.createdAt }]
  if (o.type === 'home_pickup' && o.status !== 'pickup_scheduled') o.history.push({ status: 'received', at: o.createdAt })
  if (o.startedAt) o.history.push({ status: 'in_progress', at: o.startedAt })
  if (o.readyAt) o.history.push({ status: 'ready', at: o.readyAt })
  if (o.status === 'out_for_delivery') o.history.push({ status: 'out_for_delivery', at: at(0, 8, 30) })
  if (o.closedAt) o.history.push({ status: o.status, at: o.closedAt })
}

export const mockData = { settings, customers, staff, riders, orders }

export default mockData
