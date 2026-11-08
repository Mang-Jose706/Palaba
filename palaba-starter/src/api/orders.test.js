import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cancelOrder, createOrder, getOrder, getOrderByTrackingCode, markReady, startWashing, weighOrder } from './orders.js'
import { resetData } from './store.js'
import sampleData from '../test/sampleData.js'

beforeEach(() => {
  resetData(sampleData)
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

const customer = { name: 'Test Customer', mobile: '0917 000 1111' }

describe('createOrder', () => {
  it('drop-off: price from computePrice, full payment, and NO text (rule 5)', async () => {
    const o = await createOrder({
      type: 'drop_off',
      customer,
      service: 'wash_dry_fold',
      kg: 10,
      paymentOption: 'pay_now',
      payment: { method: 'cash' },
    })
    expect(o.status).toBe('received')
    expect(o.price.total).toBe(250)
    expect(o.payment.amount).toBe(250)
    expect(o.texts).toEqual([])
  })

  it('home pickup: sends the Pickup scheduled text', async () => {
    const o = await createOrder({
      type: 'home_pickup',
      customer,
      service: 'wash_dry',
      returnMethod: 'home_delivery',
      paymentOption: 'on_delivery',
      riderId: 'r-01',
      pickup: { date: '2026-11-09', window: '1:00–3:00 PM', address: 'Purok 1' },
    })
    expect(o.status).toBe('pickup_scheduled')
    expect(o.price.total).toBeNull() // not weighed yet
    expect(o.texts.map((t) => t.kind)).toEqual(['pickup_scheduled'])
  })

  it('rejects "On delivery" when the customer picks up at the shop', async () => {
    await expect(
      createOrder({
        type: 'home_pickup',
        customer,
        service: 'wash_dry',
        returnMethod: 'shop_pickup',
        paymentOption: 'on_delivery',
        pickup: { date: '2026-11-09', window: '1:00–3:00 PM', address: 'Purok 1' },
      }),
    ).rejects.toThrow()
  })

  it('reuses an existing customer by mobile number, ignoring spaces', async () => {
    const o = await createOrder({
      type: 'drop_off',
      customer: { name: 'Rosa L.', mobile: '0917 123 4501' },
      service: 'wash_dry',
      kg: 3,
      paymentOption: 'pay_at_pickup',
    })
    expect(o.customerId).toBe('c-01')
  })

  it('cancel: only while received, and a prepaid order needs the refund confirmed', async () => {
    const o = await createOrder({
      type: 'drop_off',
      customer,
      service: 'wash_dry',
      kg: 4,
      paymentOption: 'pay_now',
      payment: { method: 'cash' },
    })
    await expect(cancelOrder(o.id, { reason: 'Entered by mistake' })).rejects.toThrow(/Return/)
    const cancelled = await cancelOrder(o.id, { reason: 'Entered by mistake', refunded: true })
    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.payment.refundedAt).toBeTruthy()
    expect(cancelled.texts).toEqual([]) // no cancellation text (rule 5)

    const o2 = await createOrder({ type: 'drop_off', customer, service: 'wash_dry', kg: 4, paymentOption: 'pay_at_pickup' })
    await startWashing(o2.id)
    await expect(cancelOrder(o2.id, { reason: 'Other: x' })).rejects.toThrow(/Washing has started/)
  })

  it("the rider's door weight is final (rule 8)", async () => {
    // LT-1044 in mock data was weighed by the rider
    await expect(weighOrder('LT-1044', 5)).rejects.toThrow()
  })

  it('public tracking data has no times, mobile numbers or full names', async () => {
    const t = await getOrderByTrackingCode('d7s5pe') // LT-1044, ready for delivery
    const json = JSON.stringify(t)
    expect(json).not.toMatch(/\d{4}-\d{2}-\d{2}T/) // no ISO timestamps
    expect(json).not.toMatch(/09\d{9}/) // no customer mobile
    expect(json).not.toContain('Dizon') // first name only
    expect(t.customerFirstName).toBe('Marites')
    expect(t.steps.find((s) => s.state === 'current').status).toBe('ready')
    expect(t.steps.every((s) => !('at' in s))).toBe(true)
    expect(t.price.total).toBe(300)
    await expect(getOrderByTrackingCode('nope')).rejects.toThrow()
  })

  it('Mark ready sends the Ready text with the amount due', async () => {
    const o = await createOrder({ type: 'drop_off', customer, service: 'wash_dry_fold', kg: 6, paymentOption: 'pay_at_pickup' })
    await startWashing(o.id)
    await markReady(o.id)
    const after = await getOrder(o.id)
    expect(after.texts.map((t) => t.kind)).toEqual(['ready_for_pickup'])
  })
})
