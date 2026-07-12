# NAXORA Institute OS — Part 36 Mobile Responsive Polish

## Added

- Mobile drawer sidebar
- Mobile top app bar
- Mobile bottom navigation
- Responsive cards, forms, filters and lists
- Small-screen spacing polish
- Table overflow fix
- Safe-area padding for modern phones
- Reduced-motion accessibility support
- Part 36 status route: `/api/mobile-polish/status`

## Run

1. Copy your working `.env` into `backend/.env`.
2. Stop old backend:

```bash
taskkill /F /IM node.exe
```

3. Start Part 36 backend:

```bash
cd backend
npm install
npm run dev
```

4. Open frontend with Live Server or open hosted frontend:

```text
http://127.0.0.1:5000/app
```

## Check

```text
http://127.0.0.1:5000/api/health
http://127.0.0.1:5000/api/mobile-polish/status
```

If old part appears in `/api/health`, stop all Node processes and run this Part 36 backend folder only.
