import { beforeEach, describe, expect, it } from 'vitest'
import { textKindFor, textToSend } from './sms.js'
import { updateSettings } from './settings.js'
import { resetData } from './store.js'

beforeEach(() => resetData())

const shop = { type: 'drop_off', returnMethod: 'shop_pickup', paymentOption: 'pay_at_pickup' }
const home = { type: 'home_pickup', returnMethod: 'home_delivery', paymentOption: 'after_weighing' }

describe('rule 5: texts only when the customer must act', () => {
  it('sends Ready for pickup, Pickup scheduled, Out for delivery and Amount after weighing', () => {
    expect(textToSend(shop, 'ready')).toBe('ready_for_pickup')
    expect(textToSend(home, 'created')).toBe('pickup_scheduled')
    expect(textToSend(home, 'out_for_delivery')).toBe('out_for_delivery')
    expect(textToSend(home, 'weighed_by_staff')).toBe('amount_after_weighing')
  })

  it('"Order received" and "Washing started" exist but are OFF by default', () => {
    expect(textKindFor(shop, 'created')).toBe('order_received')
    expect(textKindFor(shop, 'in_progress')).toBe('washing_started')
    expect(textToSend(shop, 'created')).toBeNull()
    expect(textToSend(shop, 'in_progress')).toBeNull()
  })

  it('no text for cancel, claimed, delivered, or Ready on a home delivery', () => {
    for (const ev of ['cancelled', 'claimed', 'delivered']) expect(textKindFor(shop, ev)).toBeNull()
    expect(textKindFor(home, 'ready')).toBeNull()
    expect(textKindFor({ ...home, paymentOption: 'at_the_door' }, 'weighed_by_staff')).toBeNull()
  })

  it('respects the Settings switches', async () => {
    await updateSettings({ texts: { ready_for_pickup: false } })
    expect(textToSend(shop, 'ready')).toBeNull()
  })
})
