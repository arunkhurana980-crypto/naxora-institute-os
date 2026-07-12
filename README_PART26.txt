# NAXORA Institute OS — Part 26 Super Admin Panel

Part 26 me SaaS owner ke liye Super Admin Control Room add hai.

## Features

- All institutes overview
- Active / trial / past due / expired subscription tracking
- Estimated MRR and collected amount
- Plan breakdown
- Expiring in 7 days / 30 days alerts
- Institute block / pause / active controls
- Plan upgrade to Premium from Super Admin
- Super Admin notes and action history
- Route fix: `/api/super-admin` registered in `server.js`

## Run

```bash
cd backend
npm install
npm run dev
```

Health check:

```text
http://127.0.0.1:5000/api/health
```

Expected route log:

```text
✅ PART 26 ROUTES ACTIVE: /api/super-admin
```

Frontend:

```text
frontend/index.html → Open with Live Server
```

Flow:

```text
Login → Dashboard → Super Admin
```

## API

```text
GET    /api/super-admin
POST   /api/super-admin/notes
PATCH  /api/super-admin/institutes/:id/status
PATCH  /api/super-admin/institutes/:id/plan
DELETE /api/super-admin/actions/:id
```
