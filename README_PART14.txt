# NAXORA Institute OS — Part 14: Library & Study Material System

Part 14 adds a premium library module for books, PDFs, notes, videos, useful links and physical issue/return tracking.

## New Module
- Library & Study Material page
- Add book / PDF / video / notes / link / assignment material
- Assign material to course, batch, subject and class level
- Digital resource URL support
- Physical copies tracking
- Issue material to student
- Mark return and track overdue/lost records
- Search + filters by type, status, format and difficulty
- Dashboard stats updated

## New Backend APIs
```txt
GET    /api/library
POST   /api/library
GET    /api/library/:id
PUT    /api/library/:id
PATCH  /api/library/:id/status
POST   /api/library/:id/issue
PATCH  /api/library/:id/issue/:recordId
DELETE /api/library/:id
```

## Run Steps
1. Copy your working `.env` into `backend/.env`
2. Stop old Node server:
```bash
taskkill /F /IM node.exe
```
3. Start Part 14 backend:
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
✅ PART 14 ROUTES ACTIVE: /api/library
```

## Frontend
Open with Live Server:
```txt
frontend/index.html
```

Flow:
```txt
Login → Dashboard → Library → Add Study Material / Issue Book
```

## Next Part
Part 15: Expense & Income Management System.
