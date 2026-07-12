NAXORA Institute OS - Part 10: Tests & Results Management System

New backend APIs:
GET    /api/tests
POST   /api/tests
GET    /api/tests/:id
PUT    /api/tests/:id
PATCH  /api/tests/:id/status
DELETE /api/tests/:id

Features:
- Create MCQ / descriptive / practical / mixed tests
- Batch-wise test records
- Student marks/result rows
- Pass/fail/absent status
- Grade auto calculation
- Pass percentage, average marks, highest marks
- Publish result
- Dashboard stats updated

Run:
1. Copy your working .env to backend/.env
2. taskkill /F /IM node.exe
3. cd backend
4. npm install
5. npm run dev
6. Check http://127.0.0.1:5000/api/health

Terminal should show:
✅ PART 10 ROUTES ACTIVE: /api/tests
