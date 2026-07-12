PART 21 - TIMETABLE MANAGEMENT SYSTEM

Features added:
- Weekly timetable page
- Add/edit/delete class slots
- Batch-wise, teacher-wise, room-wise schedule
- Day, start time, end time, mode, room, priority, status
- Conflict warning for same teacher/room/batch overlapping time
- Weekly grid view
- Search and filters
- Dashboard timetable stats
- Sidebar Timetable link visible

Backend API:
GET    /api/timetable
POST   /api/timetable
GET    /api/timetable/:id
PUT    /api/timetable/:id
PATCH  /api/timetable/:id/status
DELETE /api/timetable/:id

Run:
1. Copy your working backend/.env into this part backend folder.
2. taskkill /F /IM node.exe
3. cd backend
4. npm install
5. npm run dev
6. Open frontend/index.html with Live Server.
