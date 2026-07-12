NAXORA Institute OS - Part 18: Student Progress Tracking System

New APIs:
GET    /api/progress
POST   /api/progress
GET    /api/progress/:id
PUT    /api/progress/:id
PATCH  /api/progress/:id/status
DELETE /api/progress/:id

Frontend:
frontend/progress.html
frontend/progress.css
frontend/progress.js

Run:
1) Copy your working backend/.env into this backend folder.
2) taskkill /F /IM node.exe
3) cd backend
4) npm install
5) npm run dev
6) Open frontend/index.html with Live Server.

Terminal should show:
✅ PART 18 ROUTES ACTIVE: /api/progress
