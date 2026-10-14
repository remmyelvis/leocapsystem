# Leocap Invest: Frontend

React 18 + Vite + React Router single-page app (applicant, admin, HR and finance portals). Talks to the Flask API in `../backend`.

## Getting Started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output in dist/ (the backend can serve it)
npm run lint
```

The dev server proxies `/api` to `http://localhost:5000` (`vite.config.ts`). Start the backend first (see `../backend/README.md`). On macOS, port 5000 is used by AirPlay Receiver, so run Flask on another port and change the proxy target.

Optional env: `VITE_BACKEND_URL` (absolute backend URL, used for file downloads such as the loan calculator export).

## Notes

- `src/lib/` (API clients, loan math) is excluded by the root `.gitignore` (`lib/`), so it must be present locally for the app to build.
- See `CLAUDE.md` for structure, roles, loan rules and business logic.
