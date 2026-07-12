# NAXORA Institute OS — Part 43

## Admin Analytics Charts + Growth Dashboard

This is an integrated full build based on Part 42 folder-fixed build. It keeps the existing Part 1 to Part 42 modules and adds Part 43 analytics.

### Added

- Admin Analytics page
- Revenue growth chart
- Leads conversion funnel
- Student growth chart
- SaaS plan breakdown
- Live classes usage analytics
- Discovery marketplace analytics
- Founder alerts
- Mock-mode fallback if MongoDB is not connected
- Backend route: `/api/admin-analytics`
- Public status route: `/api/admin-analytics/status`
- Sidebar link: Admin Analytics

### Run

```bash
cd backend
npm install
npm run dev
```

### Check

- http://127.0.0.1:5000/api/health
- http://127.0.0.1:5000/api/admin-analytics/status
- http://127.0.0.1:5000/api/route-check
- http://127.0.0.1:5000/app

### Frontend

Open:

- `frontend/index.html` with Live Server, then login and go to **Admin Analytics**
- or backend hosted frontend: `http://127.0.0.1:5000/app`

### Note

This is not a small standalone ZIP. It is merged on top of the Part 42 integrated build.
