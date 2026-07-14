# NAXORA Institute OS — Part 75 Student AI Tools

## Part number and exact name
Part 75 — Student AI Tools

## Features added
- AI Study Planner
- Weak Topic Coach
- AI Flashcards
- VANI Revision Assistant
- Institute Recommendation AI
- Student AI Tools frontend page
- Part 75 API status, config, roles, activity, checklist and demo endpoints
- AI Hub card/link update
- Master Progress Record update

## Why each feature was added
AI Study Planner gives a student a clear daily/weekly study plan. Weak Topic Coach turns weak chapters into supportive action steps. AI Flashcards support fast active recall. VANI Revision Assistant gives Hindi/English/Hinglish voice/text revision support. Institute Recommendation AI connects the student learning flow with NAXORA discovery marketplace.

## Problem solved
Students often do not know what to revise, how to improve weak topics, or how to practise quickly. This part converts the AI Hub from owner/institute tools into a student-facing personalized learning assistant.

## Benefits
Owner: higher student engagement and premium AI product value.
Institute: better retention, better learning support and visible AI differentiation.
Teacher: weak topics and revision cards can support assigned students.
Student: personal planner, flashcards, VANI revision support and institute recommendations.
Parent: child gets structured home-study support and visible progress plan.

## Frontend/UI changes
- `frontend/student-ai-tools.html`
- `frontend/student-ai-tools.css`
- `frontend/student-ai-tools.js`
- `frontend/ai-hub.html` updated with Part 75 card

## Backend changes
- `backend/src/server.js` updated with Part 75 config, logic, routes and VANI endpoint.

## Database changes
No required migration. Optional future log collection:
- `part75studentaitoolslogs`

## API changes
- `GET /api/part75/status`
- `GET /api/part75/config`
- `GET /api/part75/features`
- `GET /api/part75/roles`
- `GET /api/part75/study-planner`
- `GET /api/part75/weak-topic-coach`
- `GET /api/part75/flashcards`
- `GET /api/part75/vani-revision`
- `GET /api/part75/institute-recommendations`
- `POST /api/part75/vani/command`
- `GET /api/part75/activity`
- `GET /api/part75/checklist`
- `GET /api/part75/export`
- `GET /api/part75/demo`

## Role permissions
Owner sees institute-level AI learning usage summary. Branch Manager sees assigned branch. Teacher sees assigned students/batches. Student sees only own planner, weak topics, flashcards and VANI revision. Parent sees only linked child summary. Receptionist can use institute recommendation context. Accountant has AI usage summary only. NAXORA Super Admin has logged technical support only.

## Security considerations
- No `.env` included.
- No passwords, API keys, MongoDB URI, JWT secret or Razorpay secret included.
- No real paid AI API call is made.
- Student private learning data is private-screen-first.
- VANI does not speak sensitive personal learning details loudly in public areas.
- Save/share/export actions require preview and confirmation.
- Export requires owner/authorised verification.

## VANI integration
VANI commands added:
- “VANI, revision plan banao”
- “VANI, weak topic coach karo”
- “VANI, flashcards banao”
- “VANI, institute recommend karo”

VANI asks for missing details, resolves ambiguity safely, previews results and stores activity logs.

## Testing steps
1. Open `/api/part75/status`.
2. Open `/student-ai-tools`.
3. Open `/api/part75/demo`.
4. Test `/api/part75/study-planner?studentName=Aman&weakTopic=Quadratic%20Equations`.
5. Test `/api/part75/flashcards?topic=Quadratic%20Equations`.
6. Test `/api/part75/vani-revision?q=revision%20plan%20banao&studentName=Aman&weakTopic=Quadratic%20Equations`.
7. Confirm `/ai-hub` shows Student AI Tools card.

## Expected test results
- Status API returns `success: true`.
- Student AI Tools page opens.
- Demo returns planner, flashcards, weak topic coach and recommendations.
- VANI preview returns safe private-screen-first response.

## Known limitations
- Real AI API integration pending.
- Production student/test schema hard-connect pending.
- Real mobile app student experience comes in NAXORA OS 2.0.
- Institute recommendation is foundation/demo-safe until marketplace data is fully live.

## Pending work
- Part 76 Smart Classroom Setup Module.
- Later mobile student app in Part 82.
- Advanced VANI modules in Part 84–88.

## Setup and environment-variable instructions
No new environment variables are required. Keep existing Render variables only.

## Previous feature preservation
Part 52–74 files and routes are preserved. Part 74 frontend route fix is included in this build base.
