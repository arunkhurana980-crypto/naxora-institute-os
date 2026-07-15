# Part 91 — Fee and Batch Information Assistant

## Part number and exact name
Part 91 — Fee and Batch Information Assistant

## Features added
- Fee and Batch Information Assistant page.
- Course/batch catalog foundation.
- Fee structure lookup.
- Batch timing lookup.
- Course + fee + batch combined answer.
- Installment preview.
- Demo slot preview.
- Eligibility preview.
- VANI fee/batch information commands.
- Role-based access checks.
- Audit log foundation.

## Why each feature was added
Parents/students often ask fees, timings, seats and demo slots before admission. Staff need quick, safe answers.

## Problem solved
Fee/batch information was scattered. Part 91 gives one safe assistant for fee and batch information.

## Benefits
Owner: consistent fee and batch communication.
Institute: faster admission counselling.
Teacher: assigned batch timing clarity.
Student: safe course/batch info.
Parent: linked child/public fee/batch info clarity.

## Frontend/UI changes
- `frontend/fee-batch-information-assistant.html`
- `frontend/fee-batch-information-assistant.css`
- `frontend/fee-batch-information-assistant.js`

## Backend changes
- `backend/src/server.js` updated with Part 91 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `coursebatchcatalogs`
- `feestructurepreviews`
- `batchavailabilitysnapshots`
- `demoSlotPreviews`

## API changes
- `/api/part91/status`
- `/api/part91/config`
- `/api/part91/features`
- `/api/part91/roles`
- `/api/part91/access-check`
- `/api/part91/course-batch-catalog`
- `/api/part91/query/parse`
- `/api/part91/fee-structure`
- `/api/part91/batch-info`
- `/api/part91/course-fee-batch`
- `/api/part91/installment-preview`
- `/api/part91/demo-slot-preview`
- `/api/part91/eligibility-preview`
- `/api/part91/vani/greeting`
- `/api/part91/vani/command`
- `/api/part91/audit-log`
- `/api/part91/activity`
- `/api/part91/checklist`
- `/api/part91/export`
- `/api/part91/demo`

## Role permissions
Owner, branch manager and receptionist/counsellor can access fee/batch counselling preview. Accountant can access fee/installment preview. Teacher gets assigned batch preview. Student/parent get safe-only information. Super Admin has platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- Fee information is preview-only.
- Seats are preview-only.
- No admission create.
- No seat hold.
- No demo booking.
- No discount/fee change without owner verification.
- Sensitive fee data is private-screen-first.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, Class 10 Maths ki fee aur batch timing batao
- VANI, JEE foundation ka batch aur fee batao
- VANI, weekend revision batch available hai?
- VANI, Class 10 Science installment preview dikhao
- VANI, demo slot preview banao

## Testing steps
1. Deploy to Render.
2. Open `/api/part91/status`.
3. Open `/fee-batch-information-assistant`.
4. Click Start VANI.
5. Ask the sample fee/batch command.
6. Test student/parent safe-only role.
7. Test demo slot preview confirmation policy.

## Expected test results
- Status returns success true.
- Page opens.
- Fee preview appears.
- Batch timing appears.
- Installment preview appears.
- Demo preview requires confirmation.
- Student/parent get safe-only access.
- Final fee/seat/demo action is not executed.

## Known limitations
- Rule-based foundation only.
- Production DB write is not enabled.
- Real batch capacity sync pending.
- Real demo booking starts in Part 92.
- Browser mic support depends on browser permission/support.

## Pending work
- Part 92 — Automatic Demo-Class Booking
- Production course/batch persistence
- Real batch seat availability connection
- Real admission CRM connection

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–90 are preserved.
