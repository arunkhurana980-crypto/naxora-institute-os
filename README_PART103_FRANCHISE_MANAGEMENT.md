# Part 103 — Franchise Management

## Part number and exact name
Part 103 — Franchise Management

## Features added
- Franchise Management page.
- Franchise registry preview.
- Franchise onboarding pipeline.
- Compliance checklist.
- Royalty/payment preview.
- Brand asset controls.
- Franchise performance scoring.
- Support ticket preview.
- Renewal risk preview.
- Role-scoped franchise summaries.
- Private-screen-first franchise privacy policy.
- VANI franchise management commands.
- Role-based franchise access checks.
- Soft calm VANI voice preserved.

## Why each feature was added
NAXORA owners may expand through franchise centres. This part creates safe franchise oversight for onboarding, compliance, royalty, brand assets and support.

## Problem solved
Franchise network operations need structure, permissions and safe owner verification for sensitive legal/financial actions.

## Benefits
Owner: can monitor all franchises and approve sensitive actions.
Institute: can expand with controlled quality.
Franchise Owner: can see own onboarding/compliance/support status.
Teacher: can see academic compliance/training summary.
Student/Parent: can view safe centre status only.

## Frontend/UI changes
- `frontend/franchise-management.html`
- `frontend/franchise-management.css`
- `frontend/franchise-management.js`
- `frontend/vani-voice-starter.js` soft calm voice preserved

## Backend changes
- `backend/src/server.js` updated with Part 103 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `franchises`
- `franchiseonboarding`
- `franchisecompliance`
- `franchiseroyalty`
- `franchisebrandassets`
- `franchisesupporttickets`
- `franchiseauditlogs`

## API changes
- `/api/part103/status`
- `/api/part103/config`
- `/api/part103/features`
- `/api/part103/roles`
- `/api/part103/access-check`
- `/api/part103/franchises`
- `/api/part103/dashboard`
- `/api/part103/onboarding`
- `/api/part103/compliance`
- `/api/part103/royalty-preview`
- `/api/part103/brand-assets`
- `/api/part103/performance`
- `/api/part103/support-ticket-preview`
- `/api/part103/renewal-risk`
- `/api/part103/role-scoped-summary`
- `/api/part103/privacy-policy`
- `/api/part103/vani/greeting`
- `/api/part103/vani/command`
- `/api/part103/audit-log`
- `/api/part103/activity`
- `/api/part103/checklist`
- `/api/part103/export`
- `/api/part103/demo`

## Role permissions
Owner can manage all authorised franchises. Franchise owner can view own franchise only. Branch manager sees assigned operational summary only. Accountant sees royalty/payment safe summary only. Teacher sees academic compliance summary only. Receptionist/counsellor sees onboarding/enquiry summary only. Student/parent see own/linked child centre-safe status only. Super Admin has platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- No auto legal/agreement changes.
- No auto royalty term changes.
- No auto franchise suspension.
- No auto brand asset unlock.
- Agreement export requires owner verification.
- Royalty export/terms change requires owner verification.
- Franchise suspend/territory change requires owner verification.
- Sensitive legal/financial details are private-screen-first.
- VANI speaks safe count-level summaries only.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, franchise overview dikhao
- VANI, South franchise compliance check karo
- VANI, royalty pending summary dikhao
- VANI, franchise performance compare karo
- VANI, support ticket preview banao
- VANI, franchise renewal risk batao

## Testing steps
1. Deploy to Render.
2. Open `/api/part103/status`.
3. Open `/franchise-management`.
4. Click Start VANI.
5. Ask the sample franchise performance/compliance command.
6. Test owner role.
7. Test franchise owner role.
8. Test accountant, teacher, counsellor, student and parent scoped roles.

## Expected test results
- Status returns success true.
- Page opens.
- Franchise dashboard appears.
- Onboarding pipeline appears.
- Compliance checks appear.
- Royalty preview appears for allowed roles.
- Brand asset controls appear.
- Support ticket preview appears.
- Sensitive data remains private-screen-first.
- VANI gives safe franchise summary.

## Known limitations
- Preview/demo franchise data only.
- Production franchise database persistence pending.
- Real agreement/legal workflow pending.
- Real royalty collection workflow pending.
- Franchise alerts are rule-based foundation only.

## Pending work
- Part 104 — Branch Comparison and Benchmarking
- Production franchise data persistence
- Real agreement/document workflow
- Real royalty collection workflow
- Owner-verified franchise settings changes

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–102 are preserved.
