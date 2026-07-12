NAXORA Institute OS - Part 20: Question Bank System

New feature:
- Chapter-wise Question Bank
- MCQ, true/false, short answer, descriptive, practical, case study questions
- Subject, chapter, topic, class level, exam tag, difficulty filters
- Correct answer and explanation
- Tags, source type, usage count
- Approve/review/archive status
- Copy question for Test Builder reuse

Backend routes:
GET    /api/question-bank
POST   /api/question-bank
GET    /api/question-bank/:id
PUT    /api/question-bank/:id
PATCH  /api/question-bank/:id/status
PATCH  /api/question-bank/:id/used
DELETE /api/question-bank/:id

Run:
1. Copy your working backend/.env into this backend folder.
2. taskkill /F /IM node.exe
3. cd backend
4. npm install
5. npm run dev

Frontend:
Open frontend/index.html with Live Server.
Flow: Login -> Dashboard -> Question Bank.
