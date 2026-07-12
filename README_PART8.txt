NAXORA Institute OS - Part 8: AI Doubt Solver

New module:
- AI doubt question form
- Local NAXORA AI answer generator without paid API key
- Doubt history in MongoDB
- Subject/topic/difficulty filters
- Teacher reply/final note
- Edit/delete doubts
- Dashboard stats updated

Backend APIs:
GET    /api/doubts
POST   /api/doubts/ask
GET    /api/doubts/:id
PUT    /api/doubts/:id
PATCH  /api/doubts/:id/reply
DELETE /api/doubts/:id

Run:
1. Copy your working backend/.env into this part's backend folder.
2. taskkill /F /IM node.exe
3. cd backend
4. npm install
5. npm run dev
6. Open frontend/index.html with Live Server.

Health check:
http://127.0.0.1:5000/api/health

Expected terminal line:
✅ PART 8 ROUTES ACTIVE: /api/doubts
