# Palaba – Laundry Shop Order Tracker

Palaba is a web app for a small local laundry shop in the Philippines. It tracks every order from drop-off or home pickup until it is claimed or delivered. This file is the project brief: read it before every task.

## Tech stack (React is required)

- React 18 + Vite, JavaScript (JSX), function components and hooks only
- React Router for pages
- Tailwind CSS for styling (Palaba tokens below go in the Tailwind theme)
- Mock data first (`src/data/mock.js`) behind a small API layer (`src/api/`), so a real back end (Node.js + Express + MySQL, Semaphore SMS) can be plugged in later without changing components
- No UI kit (no MUI/Bootstrap). Icons: `lucide-react`

## Where the designs are

- `design/figma/*.png` — the team's Figma frames. **These are the source of truth for the look.** Match layout, spacing, colors and text as closely as possible.
- `design/reference-html/*.html` — screens not yet in Figma (dialogs, staff mobile, rider, customer tracking, home pickup). Open them to read exact layout, labels and copy. Rebuild them as React + Tailwind; never paste their HTML/CSS.
- When a Figma frame and a reference file disagree on looks, follow Figma. When they disagree on a business rule, follow the rules below.
- Sample names, amounts and counts in the designs are placeholders. Data comes from `mock.js`.

## Design tokens

| Token | Value | Use |
|---|---|---|
| navy | `#232F5C` | headings, main text |
| muted | `#6B7393` | secondary text |
| accent | `#3D7BEA` | links, active tab text, focus |
| active-fill | `#ABD8FA` | selected sidebar item and active tab background |
| tint | `#EAF2FE` | secondary buttons |
| bg | `#F5F8F7` | page background |
| surface | `#FFFFFF` | cards |
| line | `#DFE6E4` | borders |
| gradient | `linear-gradient(90deg, #7493F7, #2DCDE7)` | primary buttons, logo tile |
| success | bg `#E3F5EA` text `#146C3C` | Paid, Ready |
| warning | bg `#FCF1DC` text `#83520A` | Unpaid |
| danger | bg `#FBE9E7` text `#AD2A1C` | Unclaimed, Cancel |
| info | bg `#E6F0FA` text `#1B5A9E` | In progress, pickup states |
| neutral | bg `#EDF0F2` text `#465462` | Received, Claimed |

- Font: **Plus Jakarta Sans** (Google Fonts), weights 400–800.
- Radius: cards 12px, buttons and inputs 8px, badges full pill.
- Buttons and inputs at least 44px tall (48px on mobile).
- Logo: rounded square with the gradient and a white detergent-bottle icon, then the word “Palaba” with “Pal” in `#4CB2F5` and “aba” in navy, weight 800.

## Users and pages

| User | Device | Pages |
|---|---|---|
| Owner | Desktop | Everything staff see, plus Reports and Settings |
| Staff | Desktop and phone | Dashboard, New order (drop-off / home pickup), Order created (claim slip), Order details, Orders, Customers |
| Rider | Phone | Log in, Today’s trips, Pickup, Delivery, Pickup not done |
| Customer | Phone, no login | Tracking page at `/t/:code` (In progress, Ready for pickup, Out for delivery) |

Dialogs (modals): Record payment, Edit customer, Cancel order, Change status, Weigh pickup order, Mark claimed, Add staff or rider.

## Business rules (must never be broken)

1. **Pricing per washing session.** Two services set by the owner: Wash & dry (sample ₱140) and Wash, dry & fold (sample ₱175) per session. One session holds up to 7 kg. Weight is rounded **up** to the whole kg. Each kg over 7 adds 1/7 of the session price. Example: 10 kg wash, dry & fold = 175 + 3 × 25 = ₱250. Pickup fee and delivery fee are flat amounts from Settings (sample ₱50 each). Put this in ONE function, `src/utils/pricing.js`, and use it everywhere.
2. **Full payment only.** No partial payments, no balances. Drop-off: “Pay now” or “Pay at pickup”. Home pickup: “At the door”, “After weighing”, or “On delivery”. An order can never be marked Claimed or Delivered while unpaid.
3. **Statuses:** `pickup_scheduled` → `received` → `in_progress` → `ready` → `claimed`; home delivery: `ready` → `out_for_delivery` → `delivered`; plus `cancelled`. No washing/drying/folding sub-steps.
4. **Cancel only before washing starts** (`pickup_scheduled` or `received`). From `in_progress` on, hide Cancel and show “Washing has started, so this order can no longer be cancelled.”
5. **Texts (SMS) only when the customer must act:** Ready for pickup (amount due + tracking link), Pickup scheduled, Out for delivery, and Amount after weighing (only for “After weighing”). “Order received” and “Washing started” texts exist in Settings but are OFF by default. **Never show SMS costs anywhere in the UI.** In the front end, sending a text is a stub in `src/api/sms.js` that logs to the console.
6. **Payment labels:** unpaid orders show “Unpaid · ₱175 due”; paid orders show “Paid”.
7. **Unclaimed:** a Ready order the customer must claim at the shop, older than the owner’s setting (default 3 days), gets an “Unclaimed N days” badge. Orders waiting for home delivery are not “unclaimed”.
8. **The rider’s door weight is final.**

## Dashboard behavior

Tabs with counts: To start (`received`) · Processing (`in_progress`) · Ready (`ready`) · On the way (pickups and deliveries). Each order row shows exactly one next-step button:
- received → “Start washing” (opens Change status)
- in_progress → “Mark ready” (sends the Ready text)
- ready + unpaid → “Collect ₱X” (opens Record payment)
- ready + paid → “Release” (opens Mark claimed)
Summary cards: Today’s orders · Unclaimed orders · Kilos washed today (and sessions) · Collected today.

## Code conventions

- Folders: `src/components/` (shared UI: Button, Badge, Card, Tabs, Modal, Input, Sidebar, MobileHeader, OrderRow), `src/pages/`, `src/pages/rider/`, `src/pages/track/`, `src/dialogs/`, `src/utils/`, `src/api/`, `src/data/`.
- Build shared components first and reuse them; no copy-pasted markup between pages.
- Business rules live in `src/utils/` (`pricing.js`, `orderRules.js` with `nextAction`, `canCancel`, `canRelease`), never inside JSX.
- Responsive: desktop layout has the left sidebar; under 768px use the mobile layout from the reference files.
- Accessible: real `<button>`/`<label>`, visible focus ring, dialogs closable with Esc.
- After each task: run `npm run build` and fix every error before saying it is done.
