// Starting data for a brand-new shop: no customers, orders, staff or riders.
// The first person to sign up becomes the owner (src/api/staff.js signUp).
// The API layer (src/api/) copies this into localStorage on first load;
// components never import it directly. Sample data for tests lives in
// src/test/sampleData.js.

export const settings = {
  // Shop details: filled in by the owner in Settings.
  shopName: '',
  shopPhone: '',
  shopAddress: '',
  // Defaults from CLAUDE.md; the owner can change them in Settings.
  prices: {
    wash_dry: 140,
    wash_dry_fold: 175,
  },
  pickupFee: 50,
  deliveryFee: 50,
  unclaimedAfterDays: 3,
  pickupWindows: ['9:00–11:00 AM', '1:00–3:00 PM', '3:00–5:00 PM'],
  // Rule 5: texts only when the customer must act. The last two are OFF by default.
  texts: {
    ready_for_pickup: true,
    pickup_scheduled: true,
    out_for_delivery: true,
    amount_after_weighing: true,
    order_received: false,
    washing_started: false,
  },
}

export const mockData = { settings, customers: [], staff: [], riders: [], orders: [] }

export default mockData
