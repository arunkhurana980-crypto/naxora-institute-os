NAXORA Institute OS - Part 33
AI Student Roadmap System + AI Mock Tests Route Fix Helper

WHAT IS NEW
- AI Student Roadmap page
- Goal-based roadmap generator
- Weekly plan, milestones, weak areas, strengths
- Progress percentage update
- Pin, active, completed, archive status
- Route debug helper for old-backend confusion

IMPORTANT ERROR FIX
If frontend shows:
Route not found: GET /api/ai-mock-tests?
or
Route not found: GET /api/ai-roadmaps?
then old backend is running.

Fix:
1. taskkill /F /IM node.exe
2. cd backend
3. npm install
4. npm run dev
5. Open http://127.0.0.1:5000/api/route-check

Correct response should show:
Part 33 - AI Student Roadmap
Active routes:
/api/ai-mock-tests
/api/ai-roadmaps

RUN
- Copy your working backend/.env into this backend folder
- npm install
- npm run dev
- Open frontend/index.html with Live Server

FLOW
Login -> Dashboard -> AI Roadmaps -> Generate & Save Roadmap
