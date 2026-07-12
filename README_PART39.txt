NAXORA Institute OS - Part 39
Live Classes + Comments + Separate Subscription

Features:
- Schedule live classes
- Live/Completed/Cancelled status
- Join URL support: Zoom, Google Meet, YouTube, Internal placeholder
- Comments / class chat system
- Recording URL + resources support
- Live Classes subscription separate from base NAXORA OS subscription
- Live Starter / Pro / Premium / Enterprise plan structure
- Route error fix helper: /api/live-classes/status and /api/live-classes-check

Run:
1. Copy working backend/.env into this backend folder.
2. taskkill /F /IM node.exe
3. cd backend
4. npm install
5. npm run dev

Check:
- http://127.0.0.1:5000/api/health
- http://127.0.0.1:5000/api/live-classes/status

Frontend:
- frontend/index.html via Live Server
- Login -> Dashboard -> Live Classes
