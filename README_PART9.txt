NAXORA Institute OS - Part 9: Assignments & Homework System

What is added:
- Assignment/Homework MongoDB model
- Add homework / assignment
- Assign to full batch or specific student
- Due date, max marks, priority, status
- Submission status: pending, submitted, checked
- Student submission rows
- Teacher remarks
- Search and filters
- Edit / delete / mark submitted / mark checked
- Dashboard stats updated
- Protected API with JWT

New API routes:
GET    /api/assignments
POST   /api/assignments
GET    /api/assignments/:id
PUT    /api/assignments/:id
PATCH  /api/assignments/:id/status
DELETE /api/assignments/:id

How to run:
1. Copy your working backend/.env into this backend folder.
2. Kill old Node servers: taskkill /F /IM node.exe
3. cd backend
4. npm install
5. npm run dev
6. Check: http://127.0.0.1:5000/api/health
7. Open frontend/index.html with Live Server.

Expected terminal line:
✅ PART 9 ROUTES ACTIVE: /api/assignments
