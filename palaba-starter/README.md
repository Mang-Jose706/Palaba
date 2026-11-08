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

Mock accounts (password `palaba123` for all):

| Who | Username | Starts at |
|---|---|---|
| Owner | `ana` | `/login` → Dashboard (also Reports, Settings) |
| Staff | `bea` | `/login` → Dashboard |
| Rider | `arnel` or `jun` | `/rider/login` → Today's trips |
| Customer | no login | `/t/<tracking code>`, e.g. `/t/r9d2gh` (from the claim slip QR code) |

New people can create an account at `/signup` (staff or rider). The owner approves it in **Settings → Staff and riders** before it can log in. On a brand-new shop with no owner, the first sign-up becomes the owner. While developing, the log in page also shows the demo accounts as one-click buttons.

Data is mock data (`src/data/mock.js`) saved in the browser's localStorage. To start over, clear the site's storage in the browser dev tools. Texts are not really sent: `src/api/sms.js` logs them to the browser console.
