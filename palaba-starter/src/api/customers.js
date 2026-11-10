// Customers API (mock).

import { orderTotal } from '../utils/pricing.js'
import { isPaid } from '../utils/orderRules.js'
import { getData, mutate, newId, respond } from './store.js'
import { isValidMobile, normalizeMobile } from '../utils/format.js'

function withStats(data, customer) {
  const orders = data.orders.filter((o) => o.customerId === customer.id && o.status !== 'cancelled')
  const last = orders.map((o) => o.createdAt).sort().at(-1) ?? null
  return {
    ...customer,
    orderCount: orders.length,
    totalSpent: orders.filter(isPaid).reduce((sum, o) => sum + o.payment.amount, 0),
    unpaidDue: orders
      .filter((o) => !isPaid(o) && !['claimed', 'delivered'].includes(o.status))
      .reduce((sum, o) => sum + (orderTotal(o) ?? 0), 0),
    lastOrderAt: last,
  }
}

/**
 * Customers, optionally filtered by part of a name or mobile number (spaces
 * ignored). With a search, best matches come first: names starting with the
 * text, then names with a word starting with it, then the rest.
 */
export async function listCustomers({ search } = {}) {
  const data = getData()
  const q = search?.trim().toLowerCase() ?? ''
  const digits = q.replace(/\D/g, '')
  const rank = (c) => {
    const n = c.name.toLowerCase()
    if (n.startsWith(q)) return 0
    if (n.split(/\s+/).some((w) => w.startsWith(q))) return 1
    return 2
  }
  const list = data.customers
    .filter((c) => !q || c.name.toLowerCase().includes(q) || (digits.length >= 3 && normalizeMobile(c.mobile).includes(digits)))
    .map((c) => withStats(data, c))
    .sort((a, b) => (q ? rank(a) - rank(b) : 0) || a.name.localeCompare(b.name))
  return respond(list)
}

export async function getCustomer(id) {
  const data = getData()
  const customer = data.customers.find((c) => c.id === id)
  if (!customer) throw new Error('Customer not found')
  return respond(withStats(data, customer))
}

/** Look up a customer by mobile number (New order form autofill). */
export async function findCustomerByMobile(mobile) {
  const data = getData()
  const digits = normalizeMobile(mobile)
  const customer = digits ? data.customers.find((c) => normalizeMobile(c.mobile) === digits) : null
  return respond(customer ? withStats(data, customer) : null)
}

export async function createCustomer({ name, mobile, address = '', landmark = '', notes = '' }) {
  if (!name?.trim() || !mobile?.trim()) throw new Error('Enter the name and mobile number')
  if (!isValidMobile(mobile)) throw new Error('Enter an 11-digit mobile number starting with 09')
  const digits = normalizeMobile(mobile)
  const customer = mutate((data) => {
    if (data.customers.some((c) => normalizeMobile(c.mobile) === digits)) {
      throw new Error('A customer with this mobile number already exists')
    }
    const c = { id: newId('c'), name: name.trim(), mobile: digits, address: address.trim(), landmark: landmark.trim(), notes: notes.trim(), createdAt: new Date().toISOString() }
    data.customers.push(c)
    return c
  })
  return getCustomer(customer.id)
}

/** Edit a customer. `by` is the staff user id, saved with the time. */
/** Delete a customer — only one with no orders (orders keep their history). */
export async function deleteCustomer(id) {
  mutate((data) => {
    if (data.orders.some((o) => o.customerId === id)) {
      throw new Error('This customer has orders, so they can’t be deleted.')
    }
    const before = data.customers.length
    data.customers = data.customers.filter((c) => c.id !== id)
    if (data.customers.length === before) throw new Error('Customer not found')
  })
  return respond(true)
}

export async function updateCustomer(id, patch, { by = null } = {}) {
  mutate((data) => {
    const customer = data.customers.find((c) => c.id === id)
    if (!customer) throw new Error('Customer not found')
    if (patch.mobile != null) {
      if (!isValidMobile(patch.mobile)) throw new Error('Enter an 11-digit mobile number starting with 09')
      patch = { ...patch, mobile: normalizeMobile(patch.mobile) }
      if (data.customers.some((c) => c.id !== id && normalizeMobile(c.mobile) === patch.mobile)) {
        throw new Error('Another customer already uses this mobile number')
      }
    }
    if ('name' in patch && !patch.name?.trim()) throw new Error('Enter the customer name')
    for (const key of ['name', 'mobile', 'address', 'landmark', 'notes']) {
      if (key in patch) customer[key] = typeof patch[key] === 'string' ? patch[key].trim() : patch[key]
    }
    customer.updatedAt = new Date().toISOString()
    customer.updatedBy = by
  })
  return getCustomer(id)
}
