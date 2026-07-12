# NAXORA Institute OS — Part 25

## SaaS Subscription Plans System + Error Fix Build

Part 25 me `/api/subscriptions` route properly register hai. Is build me frontend sidebar me **Subscriptions** link visible hai aur backend health route me Part 25 clearly dikhna chahiye.

### New Features

- Free / Starter / Pro / Premium / Enterprise plans
- Monthly / yearly billing
- Plan expiry + next billing date
- Active / trial / past due / paused / cancelled / expired status
- Student, teacher, branch, user, AI doubt, storage limits
- Usage tracking with percent bars
- Payment mode + last payment amount
- Upgrade / downgrade structure
- NAXORA VANI AI paid add-on card
- VANI AI usage cap system
- Search + filters
- Protected APIs with JWT

### Routes

```txt
GET    /api/subscriptions
POST   /api/subscriptions
GET    /api/subscriptions/plans
GET    /api/subscriptions/:id
PUT    /api/subscriptions/:id
PATCH  /api/subscriptions/:id/status
PATCH  /api/subscriptions/:id/addon
DELETE /api/subscriptions/:id
```

### Run

```bash
taskkill /F /IM node.exe
cd backend
npm install
npm run dev
```

### Check

Open:

```txt
http://127.0.0.1:5000/api/health
```

You should see:

```txt
Part 25 - SaaS Subscription Plans
```

Terminal should show:

```txt
✅ PART 25 ROUTES ACTIVE: /api/subscriptions
```

### Important

If you see `Route not found: GET /api/subscriptions`, then old backend is running. Run `taskkill /F /IM node.exe`, then start only this Part 25 backend.
