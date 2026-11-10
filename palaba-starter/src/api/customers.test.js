import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findCustomerByMobile, listCustomers, updateCustomer } from './customers.js'
import { createOrder, getOrder } from './orders.js'
import { resetData } from './store.js'
import sampleData from '../test/sampleData.js'

beforeEach(() => {
  resetData(sampleData)
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

describe('customers from new orders', () => {
  it('a new customer on a new order is saved to the Customers list', async () => {
    await createOrder({ type: 'drop_off', customer: { name: 'Lorna Bautista', mobile: '0918 765 4321' }, service: 'wash_dry', kg: 4, paymentOption: 'pay_at_pickup' })
    const list = await listCustomers()
    const saved = list.find((c) => c.name === 'Lorna Bautista')
    expect(saved).toBeTruthy()
    expect(saved.mobile).toBe('09187654321')
    expect(saved.orderCount).toBe(1)
  })

  it('a returning customer is reused, not duplicated', async () => {
    const before = (await listCustomers()).length
    await createOrder({ type: 'drop_off', customer: { name: 'Rosa Lim', mobile: '09171234501' }, service: 'wash_dry', kg: 4, paymentOption: 'pay_at_pickup' })
    expect((await listCustomers()).length).toBe(before)
  })
})

describe('name search for the New order box', () => {
  it('finds customers by part of a name, best matches first', async () => {
    const list = await listCustomers({ search: 'ma' })
    // "Marites Dizon" starts with "ma"; "Liza Manalo" only has a word starting with it
    expect(list[0].name).toBe('Marites Dizon')
    expect(list.map((c) => c.name)).toContain('Liza Manalo')
  })

  it('finds customers by mobile number typed with spaces', async () => {
    const list = await listCustomers({ search: '0917 123 4503' })
    expect(list.map((c) => c.name)).toEqual(['Joy Santiago'])
  })
})

describe('editing the synced number', () => {
  it('a changed number is saved to the same customer, and the order texts the new number', async () => {
    await updateCustomer('c-01', { mobile: '0917 999 0001' })
    const o = await createOrder({ type: 'home_pickup', customerId: 'c-01', service: 'wash_dry', returnMethod: 'shop_pickup', paymentOption: 'after_weighing', riderId: 'r-01', pickup: { date: '2030-01-02', window: '9:00–11:00 AM', address: '8 Luna St.' } })
    expect((await findCustomerByMobile('09179990001')).id).toBe('c-01')
    expect((await getOrder(o.id)).texts[0].to).toBe('09179990001')
  })

  it('refuses a number that another customer already uses', async () => {
    await expect(updateCustomer('c-01', { mobile: '0917 123 4502' })).rejects.toThrow(/Another customer/)
  })
})
