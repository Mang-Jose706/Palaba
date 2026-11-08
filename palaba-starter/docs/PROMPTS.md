# Prompts to paste into Claude Code, in order

Run one prompt at a time. After each one, open the app in the browser (`npm run dev`), check it against the design, and fix anything before moving on. If something looks off, tell Claude exactly what, for example: “On the dashboard the active tab should have the light blue fill from design/figma/dashboard-to-start.png.”

---

## 1. Set up the project

```
Read CLAUDE.md. Create a React + Vite app in this folder (keep CLAUDE.md, design/ and docs/). Add React Router, Tailwind CSS and lucide-react. Put the Palaba design tokens and the Plus Jakarta Sans font into the Tailwind theme. Create the folder structure from CLAUDE.md with empty placeholder pages and routes for every page listed there. Run npm run build and fix any errors.
```

## 2. Business logic and mock data

```
Create src/utils/pricing.js (computePrice, fees), src/utils/orderRules.js (nextAction, canCancel, canRelease, isUnclaimed, paymentLabel) and src/data/mock.js with about 15 orders that cover every status, payment option and both drop-off and home pickup, plus customers, staff, riders and settings. Add src/api/ functions that read and update this mock data (keep it in React state or localStorage). Add simple tests for pricing and orderRules with Vitest, including the 10 kg = ₱250 example, and make them pass.
```

## 3. Shared components

```
Look at design/figma/dashboard-to-start.png and design/figma/orders.png. Build the shared components from CLAUDE.md: Logo, Sidebar (with the active item style), Button (primary gradient, secondary tint, danger), Badge (all status colors), Card, Tabs with counts, Input, Select, Modal, OrderRow. Make a temporary /components page that shows all of them so I can check them.
```

## 4. Log in and dashboard

```
Build the Log in page from design/figma/login.png and the Dashboard from design/figma/dashboard-to-start.png, dashboard-processing.png, dashboard-ready.png and dashboard-on-the-way.png. Use real data from the API layer, the four tabs with counts, and the one next-step button per row from orderRules.nextAction (not a generic “Proceed” button).
```

## 5. New order and claim slip

```
Build New order with the Drop-off tab from design/figma/new-order-drop-off.png and the Home pickup tab from design/reference-html/new-order-home-pickup.html. Prices must come from computePrice and update live. Then build Order created from design/figma/order-created.png, but follow rule 5 in CLAUDE.md: no text is sent at drop-off, the claim slip QR code links to /t/:code.
```

## 6. Order details and dialogs

```
Build Order details from design/figma/order-details.png (the step tracker must match the real status). Then build these dialogs from design/reference-html/: record-payment, change-status, cancel-order, mark-claimed, weigh-pickup-order, edit-customer. Enforce the rules: cancel only while received, full payment only, release only when paid.
```

## 7. Orders, Customers, Reports, Settings

```
Build Orders, Customers, Reports and Settings from the matching files in design/figma/. Follow CLAUDE.md where they differ: no SMS costs in Settings or Reports; Settings has pickup and delivery fees, the six text switches (two off by default) and staff plus riders; add the Add staff or rider dialog from design/reference-html/add-staff-or-rider.html.
```

## 8. Rider screens

```
Build the rider pages under /rider from design/reference-html/rider-*.html: Log in, Today's trips, Pickup (weigh with computePrice, collect, mark picked up), Delivery (Mark delivered stays disabled until paid) and Pickup not done. Mobile layout only.
```

## 9. Staff mobile and customer tracking

```
Make the staff pages responsive using design/reference-html/staff-mobile-*.html for widths under 768px. Then build the public customer tracking page at /t/:code from design/reference-html/customer-*.html: no login, shows status steps, amount due and a Call the shop button, and no times.
```

## 10. Final check

```
Go through every rule in CLAUDE.md and check that the app follows it. List anything that breaks a rule and fix it. Remove the temporary /components page, run the tests and npm run build, and give me a short summary of the pages and how to run the app.
```

---

### Tips

- Start each new session with `claude` in this folder; it reads CLAUDE.md automatically.
- Mention a design file by path (for example `@design/figma/orders.png`) so Claude looks at it.
- Use `/clear` between big steps to start fresh, and commit with git after each step that works, so you can go back if something breaks.
- If Claude wants to do something big you didn’t ask for, say “Stop, only do step N.”
