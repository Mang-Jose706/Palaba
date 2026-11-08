import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  completeDelivery,
  completePickup,
  getRiderDay,
  getRiderTrip,
  recordDeliveryPayment,
  reportTripProblem,
  windowStart,
} from './rider.js'
import { changeStatus, getOrder } from './orders.js'
import { resetData } from './store.js'
import sampleData from '../test/sampleData.js'

beforeEach(() => {
  resetData(sampleData)
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

describe('rider pickup', () => {
  it('"At the door" needs the weight and records the FULL computed amount; rider weight is final', async () => {
    // LT-1052: wash, dry & fold, pickup + delivery, at the door, rider r-01
    await expect(completePickup('LT-1052', { riderId: 'r-01', paymentOption: 'at_the_door', method: 'cash' })).rejects.toThrow(/weight/)
    const o = await completePickup('LT-1052', { riderId: 'r-01', paymentOption: 'at_the_door', kg: 7.5, method: 'gcash', bags: 2 })
    expect(o.status).toBe('received')
    expect(o.weighedBy).toBe('rider')
    // 8 kg fold = 175 + 25, + pickup 50 + delivery 50
    expect(o.payment.amount).toBe(300)
    expect(o.price.total).toBe(300)
  })

  it('"After weighing": rider does not weigh, staff weigh later', async () => {
    const o = await completePickup('LT-1053', { riderId: 'r-01', paymentOption: 'after_weighing', kg: 9 })
    expect(o.kg).toBeNull()
    expect(o.payment).toBeNull()
  })

  it('riders only see their own trips', async () => {
    await expect(getRiderTrip('LT-1052', 'r-02')).rejects.toThrow(/not assigned/)
  })
})

describe('rider delivery', () => {
  it('cannot mark delivered until the full amount is recorded (rule 2)', async () => {
    await changeStatus('LT-1044', 'out_for_delivery')
    await expect(completeDelivery('LT-1044', { riderId: 'r-01' })).rejects.toThrow(/paid/)
    await recordDeliveryPayment('LT-1044', { riderId: 'r-01', method: 'cash' })
    const done = await completeDelivery('LT-1044', { riderId: 'r-01' })
    expect(done.status).toBe('delivered')
    expect(done.payment.amount).toBe(300)
  })
})

describe('trip problems', () => {
  it('records the report and sends no text (rule 5)', async () => {
    await reportTripProblem('LT-1052', { riderId: 'r-01', reason: 'Customer not home', nextStep: 'try_later' })
    const o = await getOrder('LT-1052')
    expect(o.tripIssues).toHaveLength(1)
    expect(o.status).toBe('pickup_scheduled')
    expect(o.texts.filter((t) => t.at > o.tripIssues[0].at)).toEqual([])
  })
})

describe("today's trips", () => {
  it('sorts pickups by time window and totals what to collect', async () => {
    const day = await getRiderDay('r-01')
    expect(day.later.map((o) => o.id)).toEqual(['LT-1052', 'LT-1053']) // 1:00–3:00 before 3:00–5:00
    expect(day.now.map((o) => o.id)).toEqual(['LT-1043'])
    expect(day.toCollectOnDelivery).toBe(0) // LT-1043 was paid at the door
    expect(day.doorPayments).toBe(1)
  })

  it('windowStart understands AM/PM windows', () => {
    expect(windowStart('9:00–11:00 AM')).toBe(9 * 60)
    expect(windowStart('1:00–3:00 PM')).toBe(13 * 60)
    expect(windowStart('11:00–1:00 PM')).toBe(11 * 60)
  })
})
