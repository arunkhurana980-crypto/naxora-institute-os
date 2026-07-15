# Part 89 — AI Admission Counsellor Foundation

## Part number and exact name
Part 89 — AI Admission Counsellor Foundation

## Features added
- AI Admission Counsellor page.
- Lead intake.
- Missing detail questions.
- Lead scoring.
- Course recommendation foundation.
- Fee plan preview.
- Demo class preview.
- Follow-up script draft.
- Objection handling.
- VANI Admission Counsellor commands.
- Role-based access checks.
- Audit log foundation.

## Why each feature was added
Institutes need a consistent admission counselling assistant that helps receptionist/counsellor teams qualify leads and guide parents/students safely.

## Problem solved
Admission leads were handled manually. Part 89 gives a structured counselling flow without making unsafe final commitments.

## Benefits
Owner: better lead conversion visibility.
Institute: faster response to enquiries.
Teacher: academic fit can be previewed.
Student: gets clearer course guidance.
Parent: gets structured counselling and demo class suggestion.

## Frontend/UI changes
- `frontend/ai-admission-counsellor-foundation.html`
- `frontend/ai-admission-counsellor-foundation.css`
- `frontend/ai-admission-counsellor-foundation.js`

## Backend changes
- `backend/src/server.js` updated with Part 89 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `admissioncounsellorleads`
- `counsellorconversations`
- `leadscorelogs`
- `demoClassPreviews`

## API changes
- `/api/part89/status`
- `/api/part89/config`
- `/api/part89/features`
- `/api/part89/roles`
- `/api/part89/access-check`
- `/api/part89/counsellor/intake`
- `/api/part89/counsellor/lead-score`
- `/api/part89/counsellor/course-recommendation`
- `/api/part89/counsellor/fee-plan`
- `/api/part89/counsellor/demo-class`
- `/api/part89/counsellor/followup-script`
- `/api/part89/counsellor/objection-handling`
- `/api/part89/counsellor/conversation-reply`
- `/api/part89/vani/greeting`
- `/api/part89/vani/command`
- `/api/part89/audit-log`
- `/api/part89/activity`
- `/api/part89/checklist`
- `/api/part89/export`
- `/api/part89/demo`

## Role permissions
Owner, branch manager and receptionist/counsellor can use admission counselling. Teacher and accountant get preview-only access. Student and parent are blocked from admin counselling. Super Admin has platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- No external LLM/API keys included.
- Missing details are asked, not guessed.
- Fee plan is preview-only.
- Demo class is preview-only.
- Follow-up script is draft-only and auto-send is disabled.
- Discount/fee commitment/refund/delete/export need owner verification.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, Aman Class 10 Maths admission counselling banao parent phone 9876543210 source WhatsApp
- VANI, lead score batao
- VANI, demo class preview banao
- VANI, follow-up script banao
- VANI, fee objection ka reply batao

## Testing steps
1. Deploy to Render.
2. Open `/api/part89/status`.
3. Open `/ai-admission-counsellor-foundation`.
4. Click Start VANI.
5. Ask the sample admission counselling command.
6. Test missing detail command.
7. Test blocked student/parent roles.

## Expected test results
- Status returns success true.
- Page opens.
- Lead score appears.
- Missing details appear when missing.
- Course recommendation and fee preview appear.
- Demo class preview requires confirmation.
- Follow-up draft is not auto-sent.
- Student/parent are blocked.

## Known limitations
- Rule-based foundation only, not external LLM.
- Production DB write is not enabled.
- Real demo booking/admission create requires future production schema connection.
- Browser mic support depends on browser permission/support.

## Pending work
- Part 90 — AI Course Recommendation
- Production lead persistence
- Real CRM pipeline connection
- Optional LLM integration through Render env only

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–88 are preserved.
