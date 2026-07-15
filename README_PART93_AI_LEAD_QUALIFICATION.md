# Part 93 — AI Lead Qualification

## Part number and exact name
Part 93 — AI Lead Qualification

## Features added
- AI Lead Qualification page.
- Lead parser.
- Lead source registry.
- Qualification criteria.
- Lead score 0–100.
- Lead category: hot, warm, nurture, cold.
- Follow-up plan draft.
- Objection risk detection.
- Next action recommendation.
- Assignment preview.
- CRM payload preview.
- VANI Lead Qualification commands.
- Role-based access checks.
- Soft calm VANI voice preserved.

## Why each feature was added
Institutes need to quickly identify which admission leads should be called first and what next action should be taken.

## Problem solved
Counsellors were treating all leads equally. Part 93 prioritises leads and creates a safe follow-up plan.

## Benefits
Owner: better lead conversion visibility.
Institute: faster response to hot leads.
Teacher: academic fit note preview.
Student: receives relevant counselling flow.
Parent: gets timely follow-up when interested.

## Frontend/UI changes
- `frontend/ai-lead-qualification.html`
- `frontend/ai-lead-qualification.css`
- `frontend/ai-lead-qualification.js`
- `frontend/vani-voice-starter.js` soft calm voice preserved

## Backend changes
- `backend/src/server.js` updated with Part 93 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `leadqualificationlogs`
- `leadpriorityqueues`
- `leadfollowupplans`
- `leadassignmentpreviews`

## API changes
- `/api/part93/status`
- `/api/part93/config`
- `/api/part93/features`
- `/api/part93/roles`
- `/api/part93/access-check`
- `/api/part93/lead-sources`
- `/api/part93/criteria`
- `/api/part93/lead/parse`
- `/api/part93/lead/score`
- `/api/part93/lead/qualify`
- `/api/part93/lead/prioritize`
- `/api/part93/lead/followup-plan`
- `/api/part93/lead/objection-risk`
- `/api/part93/lead/next-action`
- `/api/part93/lead/assignment-preview`
- `/api/part93/lead/export-preview`
- `/api/part93/vani/greeting`
- `/api/part93/vani/command`
- `/api/part93/audit-log`
- `/api/part93/activity`
- `/api/part93/checklist`
- `/api/part93/export`
- `/api/part93/demo`

## Role permissions
Owner, branch manager and receptionist/counsellor can use lead qualification. Teacher and accountant get preview-only access. Student and parent are blocked. Super Admin has platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- No external AI/API keys included.
- No auto-send.
- No auto-assign.
- No final CRM write.
- Follow-up draft requires confirmation.
- Lead assignment preview requires confirmation.
- Discount/fee commitment/refund/delete/export require owner verification.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, Aman Class 10 Maths lead WhatsApp se hai parent phone 9876543210 urgent demo chahiye
- VANI, is lead ko qualify karo
- VANI, lead score batao
- VANI, follow-up plan banao
- VANI, fee objection risk check karo

## Testing steps
1. Deploy to Render.
2. Open `/api/part93/status`.
3. Open `/ai-lead-qualification`.
4. Click Start VANI.
5. Ask the sample lead qualification command.
6. Test missing detail command.
7. Test blocked student/parent roles.

## Expected test results
- Status returns success true.
- Page opens.
- Lead score appears.
- Category appears: hot/warm/nurture/cold.
- Follow-up plan appears.
- Objection risk appears.
- Assignment preview appears.
- Final save/send/assign does not execute.

## Known limitations
- Rule-based foundation only.
- Production DB write pending.
- Real CRM pipeline persistence pending.
- External AI/ML API pending.
- Browser voice quality depends on browser/device voices.

## Pending work
- Part 94 — Native Live Classroom Foundation
- Production lead qualification persistence
- Real CRM queue connection
- Optional AI API integration through Render env only

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–92 are preserved.
