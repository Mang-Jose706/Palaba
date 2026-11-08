import { beforeEach, describe, expect, it } from 'vitest'
import { getReport } from './reports.js'
import { resetData } from './store.js'
import sampleData from '../test/sampleData.js'

beforeEach(() => resetData(sampleData))

describe('getReport', () => {
  it('has 7 days ending today and matching totals', async () => {
    const r = await getReport()
    expect(r.days).toHaveLength(7)
    expect(r.days.at(-1).isToday).toBe(true)
    expect(r.last7Days).toBe(r.days.reduce((s, d) => s + d.total, 0))
    expect(r.collectedToday).toBe(r.byMethod.reduce((s, m) => s + m.total, 0))
  })

  it('to collect at pickup: open, unpaid, weighed, shop-pickup orders only', async () => {
    const r = await getReport()
    const ids = r.toCollect.map((o) => o.id)
    expect(ids).toContain('LT-1038') // ready, unpaid
    expect(ids).toContain('LT-1031') // unclaimed
    expect(ids).not.toContain('LT-1044') // home delivery: rider collects
    expect(ids).not.toContain('LT-1045') // already paid
    expect(r.toCollect.find((o) => o.id === 'LT-1031').unclaimed).toBe(true)
  })

  it('never reports SMS costs (rule 5)', async () => {
    const r = await getReport()
    expect(JSON.stringify(r).toLowerCase()).not.toMatch(/sms|text/)
  })
})
