NAXORA Institute OS - Part 6: Attendance Management System

New in Part 6:
- Attendance model
- Batch-wise daily attendance
- Present / Absent / Late / Leave status
- Attendance date, teacher, course, class timing, topic covered
- Add/edit/delete attendance sessions
- Attendance summary on dashboard
- Premium attendance frontend page
- Protected API with JWT

Backend routes:
GET    /api/attendance
POST   /api/attendance
GET    /api/attendance/:id
PUT    /api/attendance/:id
DELETE /api/attendance/:id

How to run:
1. Copy your working backend/.env file into this project's backend folder.
2. Stop old backend completely:
   taskkill /F /IM node.exe
3. Run backend:
   cd backend
   npm install
   npm run dev
4. Check health:
   http://127.0.0.1:5000/api/health
5. Open frontend/index.html with Live Server.
6. Login -> Dashboard -> Attendance.

Important:
- Backend URL: http://127.0.0.1:5000
- Frontend must open using Live Server, not file:/// path.
- Terminal must show: PART 6 ROUTES ACTIVE: /api/attendance
