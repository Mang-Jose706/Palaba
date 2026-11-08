import { describe, expect, it } from 'vitest'
import {
  PAYMENT_OPTIONS,
  STATUSES,
  canCancel,
  canDeliver,
  canRelease,
  canTransition,
  canWeigh,
  isUnclaimed,
  nextAction,
  paymentLabel,
  paymentOptionsFor,
  unclaimedLabel,
} from './orderRules.js'
import { orderTotal } from './pricing.js'
import { orders } from '../data/mock.js'

const rates = { sessionPrice: 175, pickupFee: 50, deliveryFee: 50 }
const base = { id: 'LT-1', type: 'drop_off', returnMethod: 'shop_pickup', kg: 6, rates, payment: null }
const paid = { method: 'cash', amount: 175, paidAt: '2026-11-01T00:00:00Z' }
const make = (o) => ({ ...base, ...o })

describe('nextAction', () => {
  it('received → Start washing (opens Change status)', () => {
    expect(nextAction(make({ status: 'received' }))).toMatchObject({ label: 'Start washing', dialog: 'change-status' })
  })

  it('received home pickup not weighed yet → Weigh order', () => {
    const o = make({ status: 'received', type: 'home_pickup', kg: null })
    expect(nextAction(o).type).toBe('weigh')
  })

  it('in_progress → Mark ready', () => {
    expect(nextAction(make({ status: 'in_progress' })).label).toBe('Mark ready')
  })

  it('ready + unpaid → Collect ₱X (opens Record payment)', () => {
    expect(nextAction(make({ status: 'ready', kg: 10 }))).toMatchObject({ label: 'Collect ₱250', dialog: 'record-payment' })
  })

  it('ready + paid → Release (opens Mark claimed)', () => {
    expect(nextAction(make({ status: 'ready', payment: paid }))).toMatchObject({ label: 'Release', dialog: 'mark-claimed' })
  })

  it('returns null when staff have nothing to do', () => {
    for (const status of ['pickup_scheduled', 'out_for_delivery', 'claimed', 'delivered', 'cancelled']) {
      expect(nextAction(make({ status }))).toBeNull()
    }
  })
})

describe('canCancel (rule 4)', () => {
  it('only while received', () => {
    for (const status of Object.keys(STATUSES)) {
      expect(canCancel(make({ status }))).toBe(status === 'received')
    }
  })
})

describe('canRelease / canDeliver (rule 2)', () => {
  it('never releases an unpaid order', () => {
    expect(canRelease(make({ status: 'ready' }))).toBe(false)
    expect(canRelease(make({ status: 'ready', payment: paid }))).toBe(true)
  })

  it('only releases ready orders', () => {
    expect(canRelease(make({ status: 'in_progress', payment: paid }))).toBe(false)
  })

  it('never delivers an unpaid order', () => {
    const o = make({ status: 'out_for_delivery', returnMethod: 'home_delivery' })
    expect(canDeliver(o)).toBe(false)
    expect(canDeliver({ ...o, payment: paid })).toBe(true)
  })

  it('canTransition blocks claimed/delivered while unpaid', () => {
    expect(canTransition(make({ status: 'ready' }), 'claimed')).toBe(false)
    expect(canTransition(make({ status: 'ready', payment: paid }), 'claimed')).toBe(true)
    expect(canTransition(make({ status: 'in_progress' }), 'cancelled')).toBe(false)
    expect(canTransition(make({ status: 'received' }), 'ready')).toBe(false)
  })
})

describe('canWeigh (rule 8)', () => {
  it("the rider's door weight is final", () => {
    expect(canWeigh(make({ status: 'received', type: 'home_pickup', kg: 8, weighedBy: 'rider' }))).toBe(false)
    expect(canWeigh(make({ status: 'received', type: 'home_pickup', kg: null }))).toBe(true)
  })
})

describe('isUnclaimed (rule 7)', () => {
  const now = new Date('2026-11-08T12:00:00')
  const readyDaysAgo = (d) => make({ status: 'ready', readyAt: new Date(now.getTime() - d * 86400000).toISOString() })

  it('flags ready orders older than the setting (default 3 days)', () => {
    expect(isUnclaimed(readyDaysAgo(2), {}, now)).toBe(false)
    expect(isUnclaimed(readyDaysAgo(4), {}, now)).toBe(true)
    expect(isUnclaimed(readyDaysAgo(4), { unclaimedAfterDays: 5 }, now)).toBe(false)
  })

  it('ignores orders that are not ready', () => {
    expect(isUnclaimed({ ...readyDaysAgo(10), status: 'claimed' }, {}, now)).toBe(false)
  })

  it('labels the badge "Unclaimed N days"', () => {
    expect(unclaimedLabel(readyDaysAgo(5), {}, now)).toBe('Unclaimed 5 days')
    expect(unclaimedLabel(readyDaysAgo(1), {}, now)).toBeNull()
  })
})

describe('paymentLabel (rule 6)', () => {
  it('unpaid → "Unpaid · ₱175 due"', () => {
    expect(paymentLabel(make({ status: 'ready' }))).toBe('Unpaid · ₱175 due')
  })

  it('paid → "Paid"', () => {
    expect(paymentLabel(make({ status: 'ready', payment: paid }))).toBe('Paid')
  })
})

describe('paymentOptionsFor (rule 2)', () => {
  it('drop-off: Pay now or Pay at pickup', () => {
    expect(paymentOptionsFor('drop_off').map((o) => o.label)).toEqual(['Pay now', 'Pay at pickup'])
  })

  it('home pickup: On delivery only when delivered back home', () => {
    expect(paymentOptionsFor('home_pickup', 'home_delivery').map((o) => o.id)).toEqual(['at_the_door', 'after_weighing', 'on_delivery'])
    expect(paymentOptionsFor('home_pickup', 'shop_pickup').map((o) => o.id)).toEqual(['at_the_door', 'after_weighing'])
  })
})

describe('mock data', () => {
  it('covers every status, payment option and order type', () => {
    expect(orders.length).toBeGreaterThanOrEqual(15)
    for (const status of Object.keys(STATUSES)) {
      expect(orders.some((o) => o.status === status), status).toBe(true)
    }
    for (const option of [...PAYMENT_OPTIONS.drop_off, ...PAYMENT_OPTIONS.home_pickup]) {
      expect(orders.some((o) => o.paymentOption === option.id), option.id).toBe(true)
    }
    expect(orders.some((o) => o.type === 'drop_off')).toBe(true)
    expect(orders.some((o) => o.type === 'home_pickup')).toBe(true)
  })

  it('never breaks the payment rules', () => {
    for (const o of orders) {
      if (o.payment) expect(o.payment.amount, o.id).toBe(orderTotal(o))
      if (['claimed', 'delivered'].includes(o.status)) expect(o.payment, o.id).toBeTruthy()
      if (o.paymentOption === 'pay_now') expect(o.payment, o.id).toBeTruthy()
    }
  })
})
