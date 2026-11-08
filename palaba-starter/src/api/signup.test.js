import { beforeEach, describe, expect, it, vi } from 'vitest'
import { approveUser, signIn, signUp } from './staff.js'
import { mutate, resetData } from './store.js'

const store = {}
beforeEach(() => {
  resetData()
  for (const k of Object.keys(store)) delete store[k]
  vi.stubGlobal('localStorage', {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => (store[k] = String(v)),
    removeItem: (k) => delete store[k],
  })
})

const form = { role: 'staff', name: 'Mia Torres', mobile: '0917 222 3333', username: 'mia', password: 'secret1' }

describe('sign up', () => {
  it('creates an account that waits for the owner’s approval', async () => {
    const { user, pending } = await signUp(form)
    expect(pending).toBe(true)
    expect(user.active).toBe(false)
    await expect(signIn('mia', 'secret1')).rejects.toThrow(/approval/)
    await approveUser(user.id)
    const signedIn = await signIn('mia', 'secret1')
    expect(signedIn.username).toBe('mia')
  })

  it('riders sign up as riders and log in at the rider page', async () => {
    const { user } = await signUp({ ...form, role: 'rider', username: 'mia.rider', mobile: '09172224444' })
    await approveUser(user.id)
    await expect(signIn('mia.rider', 'secret1', { app: 'staff' })).rejects.toThrow(/rider log in/)
    expect((await signIn('mia.rider', 'secret1', { app: 'rider' })).role).toBe('rider')
  })

  it('rejects taken usernames, used mobile numbers and weak input', async () => {
    await expect(signUp({ ...form, username: 'ANA' })).rejects.toThrow(/taken/)
    await expect(signUp({ ...form, mobile: '09181110002' })).rejects.toThrow(/mobile/)
    await expect(signUp({ ...form, password: '123' })).rejects.toThrow(/6 characters/)
    await expect(signUp({ ...form, mobile: '12345' })).rejects.toThrow(/11-digit/)
  })

  it('the first account of a shop with no owner becomes the active owner', async () => {
    mutate((d) => {
      d.staff = []
    })
    const { user, pending } = await signUp(form)
    expect(pending).toBe(false)
    expect(user.role).toBe('owner')
    expect((await signIn('mia', 'secret1')).role).toBe('owner')
  })

  it('usernames are not case-sensitive at log in', async () => {
    expect((await signIn('ANA', 'palaba123')).username).toBe('ana')
  })
})
