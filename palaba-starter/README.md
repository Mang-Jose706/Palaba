# Palaba – Laundry Shop Order Tracker

A web app for a small laundry shop: it tracks every order from drop-off or home pickup until it is claimed or delivered. Built with React 18, Vite, React Router, Tailwind CSS and lucide-react. The project brief (business rules, design tokens, conventions) is in `CLAUDE.md`.

## Running the app

Needs **Node.js LTS** (https://nodejs.org).

```
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest: pricing, order rules, API
npm run build    # production build in dist/
```

The app starts empty: no accounts, customers or orders.

1. Open the app and click **Create the owner account** (or go to `/signup`). The first account of a new shop is the **owner** and is signed in right away.
2. Follow **Finish setting up your shop** on the Dashboard: add the shop name, mobile number and address in **Settings**, check the prices and fees (defaults: ₱140 / ₱175 per session, ₱50 pickup and delivery fees), and add staff and riders.
3. Staff and riders can also sign up themselves at `/signup`; the owner approves them in **Settings → Staff and riders**.

| Who | Logs in at |
|---|---|
| Owner and staff | `/login` |
| Riders | `/rider/login` |
| Customers | no login: `/t/<tracking code>` from the claim slip QR code |

Data is saved in the browser's localStorage (starting data: `src/data/mock.js`). The tests use a separate sample shop in `src/test/sampleData.js`. To start over, clear the site's storage in the browser dev tools. Texts are not really sent: `src/api/sms.js` logs them to the browser console.

## Folders

| Folder | What's in it |
|---|---|
| `src/pages/` | Staff and owner pages; `rider/` for riders; `track/` for the customer tracking page |
| `src/dialogs/` | Pop-up dialogs (record payment, change status, cancel, …) |
| `src/components/` | Shared UI (buttons, badges, tables, layout, confirm pop-up, …) |
| `src/utils/` | Business rules: `pricing.js`, `orderRules.js`, plus formatting helpers |
| `src/api/` | Mock API over localStorage, ready to be replaced by a real back end |
| `src/data/` | Starting data for a new shop |
| `src/test/` | Sample shop used by the tests |
