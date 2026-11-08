# Palaba starter kit for Claude Code

This folder turns the Palaba Figma designs into a React app with Claude Code in the VS Code terminal.

## What’s inside

- `CLAUDE.md` — the project brief: tech stack, design tokens, business rules, folder structure. Claude Code reads it automatically at the start of every session.
- `design/figma/` — your 13 Figma frames (PNG). The source of truth for the look.
- `design/reference-html/` — 19 screens not yet in Figma (dialogs, staff mobile, rider, customer tracking, home pickup), as HTML you can open in a browser.
- `docs/PROMPTS.md` — 10 prompts to paste into Claude Code, one step at a time.

## One-time setup

1. Install **Node.js LTS** from https://nodejs.org and **Git** from https://git-scm.com.
2. Install **VS Code** from https://code.visualstudio.com.
3. Install **Claude Code**. In a terminal (on Windows, PowerShell):
   - Windows PowerShell: `irm https://claude.ai/install.ps1 | iex`
   - macOS / Linux: `curl -fsSL https://claude.ai/install.sh | bash`
   - Then open a new terminal and check: `claude --version`
   - Official guide: https://code.claude.com/docs/en/overview
4. You need a Claude subscription (Pro or higher) or an Anthropic Console account to log in.

## Start

1. Unzip this kit and open the `palaba-starter` folder in VS Code (**File → Open Folder**).
2. Open the terminal (**Terminal → New Terminal**) and run:
   ```
   git init
   claude
   ```
3. Log in when asked.
4. Open `docs/PROMPTS.md` and paste **prompt 1**. When it finishes, run `npm run dev` in a second terminal and open the link it prints.
5. Check the result against the design, then continue with prompt 2, and so on.

Optional: install the **Claude Code** extension in VS Code (Extensions → search “Claude Code”) to see changes as side-by-side diffs.

## Running the app

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
