import { describe, expect, it } from 'vitest'
import { computePrice, extraKgPrice, fees, formatPeso, orderTotal, roundKg, sessionsFor } from './pricing.js'

const FOLD = 175
const DRY = 140

describe('computePrice', () => {
  it('10 kg wash, dry & fold = 175 + 3 × 25 = ₱250 (CLAUDE.md example)', () => {
    const p = computePrice({ kg: 10, sessionPrice: FOLD })
    expect(p.extraKg).toBe(3)
    expect(p.perExtraKg).toBe(25)
    expect(p.laundry).toBe(250)
    expect(p.total).toBe(250)
  })

  it('charges one full session for 7 kg or less', () => {
    expect(computePrice({ kg: 1, sessionPrice: FOLD }).total).toBe(175)
    expect(computePrice({ kg: 7, sessionPrice: FOLD }).total).toBe(175)
    expect(computePrice({ kg: 3, sessionPrice: DRY }).total).toBe(140)
  })

  it('rounds the weight up to the whole kg', () => {
    expect(computePrice({ kg: 7.1, sessionPrice: FOLD }).total).toBe(200)
    expect(computePrice({ kg: 9.2, sessionPrice: DRY }).total).toBe(140 + 3 * 20)
  })

  it('keeps adding 1/7 of the session price past 14 kg', () => {
    expect(computePrice({ kg: 14, sessionPrice: DRY }).total).toBe(280)
    expect(computePrice({ kg: 15, sessionPrice: FOLD }).total).toBe(375)
  })

  it('adds flat pickup and delivery fees', () => {
    const p = computePrice({ kg: 10, sessionPrice: FOLD, pickup: true, delivery: true, pickupFee: 50, deliveryFee: 50 })
    expect(p.laundry).toBe(250)
    expect(p.fees).toBe(100)
    expect(p.total).toBe(350)
  })

  it('does not add fees that do not apply', () => {
    const p = computePrice({ kg: 5, sessionPrice: FOLD, pickup: true, pickupFee: 50, deliveryFee: 50 })
    expect(p.deliveryFee).toBe(0)
    expect(p.total).toBe(225)
  })

  it('returns a null total until the order is weighed', () => {
    const p = computePrice({ kg: null, sessionPrice: FOLD, pickup: true, pickupFee: 50 })
    expect(p.laundry).toBeNull()
    expect(p.total).toBeNull()
    expect(p.pickupFee).toBe(50)
  })
})

describe('helpers', () => {
  it('roundKg rounds up and ignores float noise', () => {
    expect(roundKg(6.2)).toBe(7)
    expect(roundKg(7.0000000001)).toBe(7)
    expect(roundKg(0)).toBeNull()
    expect(roundKg(null)).toBeNull()
  })

  it('sessionsFor counts 7 kg sessions', () => {
    expect(sessionsFor(7)).toBe(1)
    expect(sessionsFor(10)).toBe(2)
    expect(sessionsFor(14)).toBe(2)
    expect(sessionsFor(null)).toBe(0)
  })

  it('fees reads flat amounts from settings', () => {
    const settings = { pickupFee: 50, deliveryFee: 60 }
    expect(fees({ pickup: true, delivery: true }, settings)).toEqual({ pickupFee: 50, deliveryFee: 60, total: 110 })
    expect(fees({}, settings).total).toBe(0)
  })

  it('orderTotal uses the rates saved on the order', () => {
    const order = {
      kg: 10,
      type: 'home_pickup',
      returnMethod: 'shop_pickup',
      rates: { sessionPrice: 175, pickupFee: 50, deliveryFee: 50 },
    }
    expect(orderTotal(order)).toBe(300)
  })

  it('formatPeso', () => {
    expect(formatPeso(250)).toBe('₱250')
    expect(formatPeso(1250)).toBe('₱1,250')
    expect(formatPeso(null)).toBe('—')
  })
})

describe('extraKgPrice', () => {
  it('is 1/7 of the session price', () => {
    expect(extraKgPrice(175)).toBe(25)
    expect(extraKgPrice(140)).toBe(20)
  })
})
