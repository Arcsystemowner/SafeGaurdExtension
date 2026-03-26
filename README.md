# SafeGuard Shield (React + TypeScript + Tailwind v4)

SafeGuard Shield is a Manifest V3 browser extension starter focused on phishing signal detection.

## Stack

- React 19 (popup UI)
- TypeScript (background/content/popup)
- Tailwind CSS v4 (popup styling)
- Vite 7 (build system)

## Features

- Heuristic URL risk scoring:
  - non-HTTPS pages
  - raw IP hosts
  - punycode domains (`xn--`)
  - suspicious TLDs
  - deep subdomain chains
  - brand impersonation patterns
  - suspicious phishing keywords in path/query
- Real-time warning banner on risky pages.
- Popup dashboard with risk verdict, score, and reasons.
- Settings persisted via `chrome.storage.sync`.

## Project structure

- `public/manifest.json` – Chrome extension manifest
- `src/background.ts` – tab monitoring + message handlers
- `src/content.ts` – on-page warning banner logic
- `src/lib/riskEngine.ts` – phishing heuristics
- `src/popup/` – React + Tailwind popup app
- `vite.config.ts` – multi-entry extension build

## Local development

```bash
npm install
npm run build
```

Load the generated `dist/` directory in Chrome:

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Choose the `dist` folder

## Notes

- This is an MVP heuristic detector, not a hard security guarantee.
- For production, integrate external threat intelligence feeds.
