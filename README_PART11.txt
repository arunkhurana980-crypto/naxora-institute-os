# NAXORA Institute OS — Part 11: Reports & Analytics System

Part 11 adds a complete analytics layer on top of your existing institute data.

## New Module
- Reports & Analytics page
- Fees collection report
- Attendance report
- Tests/result analytics
- Subject performance
- Batch performance
- Top students
- Weak students
- Recent activity feed
- Print / Save PDF button

## New Backend API
```txt
GET /api/reports
```

This route is protected with JWT. Login first, then open Reports from the sidebar.

## Run Steps
1. Copy your working `.env` into `backend/.env`
2. Stop old Node server:
```bash
taskkill /F /IM node.exe
```
3. Start Part 11 backend:
```bash
cd backend
npm install
npm run dev
```
4. Check:
```txt
http://127.0.0.1:5000/api/health
```

Expected terminal line:
```txt
✅ PART 11 ROUTES ACTIVE: /api/reports
```

## Frontend
Open with Live Server:
```txt
frontend/index.html
```

Flow:
```txt
Login → Dashboard → Reports
```

## Next Part
Part 12: Notifications & Announcements System.
