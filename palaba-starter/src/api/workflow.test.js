// Workflow fixes from the full review: stuck orders, edits, accounts.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cancelOrder, changeStatus, editOrder, getOrder, listOrders, updateOrder } from './orders.js'
import { addUser, changePassword, getCurrentUser, signIn, updateUser } from './staff.js'
import { getRiderDay, reportTripProblem } from './rider.js'
import { getSettings, updateSettings } from './settings.js'
import { getData, mutate, resetData } from './store.js'
import sampleData from '../test/sampleData.js'
import { toDateKey } from '../utils/format.js'

const store = {}
beforeEach(() => {
  resetData(sampleData)
  vi.spyOn(console, 'log').mockImplementation(() => {})
  for (const k of Object.keys(store)) delete store[k]
  vi.stubGlobal('localStorage', {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => (store[k] = String(v)),
    removeItem: (k) => delete store[k],
  })
})

describe('home pickups never get stuck', () => {
  it('a pickup the customer cancelled can be cancelled before pickup (rule 4)', async () => {
    await reportTripProblem('LT-1052', { riderId: 'r-01', reason: 'Customer cancelled', nextStep: 'shop_will_call' })
    const o = await cancelOrder('LT-1052', { reason: 'Customer changed their mind' })
    expect(o.status).toBe('cancelled')
  })

  it('staff can mark a pickup received at the shop, then it needs weighing', async () => {
    const o = await changeStatus('LT-1053', 'received')
    expect(o.status).toBe('received')
    expect(o.kg).toBeNull()
  })

  it('a missed pickup stays on the rider list the next day (overdue)', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    mutate((d) => {
      d.orders.find((o) => o.id === 'LT-1052').pickup.date = toDateKey(yesterday)
    })
    const day = await getRiderDay('r-01')
    const trip = day.later.find((o) => o.id === 'LT-1052')
    expect(trip).toBeTruthy()
    expect(trip.overdue).toBe(true)
  })

  it('reschedule and reassign only while the trip is ahead', async () => {
    const o = await updateOrder('LT-1052', { pickup: { date: '2030-01-02', window: '9:00–11:00 AM' }, riderId: 'r-02' })
    expect(o.pickup.date).toBe('2030-01-02')
    expect(o.rider.id).toBe('r-02')
    await expect(updateOrder('LT-1042', { pickup: { date: '2030-01-02' } })).rejects.toThrow(/already done/)
  })
})

describe('fixing mistakes on a received order', () => {
  it('changes weight and service and re-prices with computePrice', async () => {
    // LT-1051: received, wash & dry, 9.2 kg, unpaid
    const o = await editOrder('LT-1051', { service: 'wash_dry_fold', kg: 10, bags: 3 })
    expect(o.price.total).toBe(250)
    expect(o.bags).toBe(3)
  })

  it('refuses paid orders and the rider’s door weight (rule 8)', async () => {
    await expect(editOrder('LT-1050', { kg: 3 })).rejects.toThrow() // paid
    await changeStatus('LT-1044', 'out_for_delivery')
    await expect(editOrder('LT-1044', { kg: 3 })).rejects.toThrow()
  })
})

describe('saving is all-or-nothing', () => {
  it('a failed Settings save changes nothing', async () => {
    await expect(updateSettings({ pickupFee: 70, deliveryFee: -5 })).rejects.toThrow()
    const s = await getSettings()
    expect(s.pickupFee).toBe(50)
  })
})

describe('accounts', () => {
  it('new accounts must change the temporary password', async () => {
    const u = await addUser({ role: 'rider', name: 'New Rider', mobile: '09190000000', username: 'newrider', password: 'temp123' })
    expect(u.mustChangePassword).toBe(true)
    await expect(changePassword(u.id, { current: 'wrong', next: 'mine456' })).rejects.toThrow()
    const after = await changePassword(u.id, { current: 'temp123', next: 'mine456' })
    expect(after.mustChangePassword).toBe(false)
  })

  it('a turned-off account is signed out', async () => {
    await signIn('bea', 'palaba123')
    expect((await getCurrentUser()).username).toBe('bea')
    await updateUser('u-02', { active: false })
    expect(await getCurrentUser()).toBeNull()
  })
})

describe('search', () => {
  it('finds orders by mobile number typed with spaces', async () => {
    const list = await listOrders({ search: '0917 123 4501' })
    expect(list.every((o) => o.customerId === 'c-01')).toBe(true)
    expect(list.length).toBeGreaterThan(0)
    expect(getData()).toBeTruthy()
  })
})
