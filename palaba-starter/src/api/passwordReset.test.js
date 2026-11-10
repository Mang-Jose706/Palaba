import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentUser, requestPasswordReset, resetPasswordWithCode, signIn } from './staff.js'
import { getData, resetData } from './store.js'
import sampleData from '../test/sampleData.js'

const store = {}
beforeEach(() => {
  resetData(sampleData)
  for (const k of Object.keys(store)) delete store[k]
  vi.stubGlobal('localStorage', {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => (store[k] = String(v)),
    removeItem: (k) => delete store[k],
  })
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

const codeFor = (username) => getData().staff.find((u) => u.username === username).reset?.code

describe('owner password reset by code', () => {
  it('texts a 6-digit code to the owner and lets them set a new password', async () => {
    const { sentTo } = await requestPasswordReset('Ana')
    expect(sentTo).toBe('0918 *** 0001')
    const code = codeFor('ana')
    expect(code).toMatch(/^\d{6}$/)
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining(code))

    const user = await resetPasswordWithCode('ana', { code, next: 'newpass1' })
    expect(user.reset).toBeUndefined()
    expect(user.password).toBeUndefined()
    expect((await signIn('ana', 'newpass1')).username).toBe('ana')
    await expect(signIn('ana', 'palaba123')).rejects.toThrow(/Wrong/)
    expect(codeFor('ana')).toBeUndefined()
  })

  it('is for the owner only', async () => {
    await expect(requestPasswordReset('bea')).rejects.toThrow(/Only the owner/)
    await expect(requestPasswordReset('arnel')).rejects.toThrow(/Only the owner/)
    await expect(requestPasswordReset('nobody')).rejects.toThrow(/Only the owner/)
  })

  it('rejects a wrong code and locks after 5 wrong tries', async () => {
    await requestPasswordReset('ana')
    const wrong = codeFor('ana') === '111111' ? '222222' : '111111'
    for (let i = 0; i < 4; i++) {
      await expect(resetPasswordWithCode('ana', { code: wrong, next: 'newpass1' })).rejects.toThrow(/wrong/)
    }
    await expect(resetPasswordWithCode('ana', { code: wrong, next: 'newpass1' })).rejects.toThrow(/Too many/)
    expect(codeFor('ana')).toBeUndefined()
    expect((await signIn('ana', 'palaba123')).username).toBe('ana')
  })

  it('rejects an expired code', async () => {
    await requestPasswordReset('ana')
    const code = codeFor('ana')
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 11 * 60_000)
    await expect(resetPasswordWithCode('ana', { code, next: 'newpass1' })).rejects.toThrow(/expired/)
    vi.useRealTimers()
  })

  it('checks the code format and password length', async () => {
    await requestPasswordReset('ana')
    await expect(resetPasswordWithCode('ana', { code: '12', next: 'newpass1' })).rejects.toThrow(/6-digit/)
    await expect(resetPasswordWithCode('ana', { code: codeFor('ana'), next: '123' })).rejects.toThrow(/6 characters/)
  })

  it('never exposes the code through the signed-in user', async () => {
    await signIn('ana', 'palaba123')
    await requestPasswordReset('ana')
    expect((await getCurrentUser()).reset).toBeUndefined()
  })
})
