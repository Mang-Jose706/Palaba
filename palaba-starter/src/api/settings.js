// Shop settings (owner only): service prices, fees, unclaimed days, text switches.

import { getData, mutate, respond } from './store.js'

export async function getSettings() {
  return respond(getData().settings)
}

/**
 * Merge changes into Settings. Price changes apply to NEW orders only —
 * existing orders keep the rates they were created with.
 */
export async function updateSettings(patch) {
  const settings = mutate((data) => {
    const s = data.settings
    if (patch.prices) s.prices = { ...s.prices, ...patch.prices }
    if (patch.texts) s.texts = { ...s.texts, ...patch.texts }
    for (const key of ['shopName', 'shopPhone', 'shopAddress', 'pickupFee', 'deliveryFee', 'unclaimedAfterDays', 'pickupWindows']) {
      if (key in patch) s[key] = patch[key]
    }
    for (const key of ['pickupFee', 'deliveryFee', 'unclaimedAfterDays']) {
      s[key] = Number(s[key])
      if (!(s[key] >= 0)) throw new Error('Amounts must be 0 or more')
    }
    for (const [k, v] of Object.entries(s.prices)) {
      s.prices[k] = Number(v)
      if (!(s.prices[k] > 0)) throw new Error('Service prices must be more than 0')
    }
    return s
  })
  return respond(settings)
}
