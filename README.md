# MindVault — React + Vite

Private, on-device AI journaling PWA. Everything stays in your browser's localStorage — no cloud, no server.

## Stack
React 19 · Vite · TypeScript · Tailwind CSS v4 · shadcn/ui · React Router · Recharts

## Run locally
```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # production build in dist/
```

## Structure
- `src/pages/*` — Landing, Privacy, Dashboard, Journal, Voice, Moods, Reflections, Settings, Entry detail
- `src/components/app-shell.tsx` — sidebar + top bar + mobile nav layout
- `src/lib/mindvault.ts` — localStorage data layer (entries, moods, settings, analytics)
- `src/lib/on-device-ai.ts` — heuristic offline reflection/sentiment engine
- `src/styles.css` — design tokens, dark-mode-first theme
