# Part 84 — Advanced VANI Action Engine

## Part number and exact name
Part 84 — Advanced VANI Action Engine

## Features added
- Advanced VANI page.
- Intent/module/action parser.
- Missing detail questions.
- Ambiguity resolver foundation.
- Role and permission guard.
- Preview before action.
- Explicit confirmation requirement.
- Owner verification requirement for sensitive actions.
- Safe execution simulation.
- Audit log foundation.
- VANI listen/reply integration.

## Why each feature was added
VANI needs to move from simple Q&A to real operational workflows, but safely. Every create/update/send/delete/export/payment/subscription action needs permission checks, preview, confirmation and audit logs.

## Problem solved
Without an action engine, VANI can talk but cannot reliably handle institute workflows. Part 84 creates the control layer for future VANI action modules.

## Benefits
Owner: safe AI command system with verification.
Institute: fewer manual steps and safer automation.
Teacher: future attendance/assignment/test actions through VANI.
Student: VANI can guide learning workflows safely.
Parent: VANI can prepare safe parent communication summaries.

## Frontend/UI changes
- `frontend/advanced-vani-action-engine.html`
- `frontend/advanced-vani-action-engine.css`
- `frontend/advanced-vani-action-engine.js`

## Backend changes
- `backend/src/server.js` updated with Part 84 APIs and route mapping.

## Database changes
No mandatory migration.
Future optional collections:
- `vani_action_audit_logs`
- `vani_action_previews`
- `vani_action_confirmations`
- `vani_owner_verifications`

## API changes
- `/api/part84/status`
- `/api/part84/config`
- `/api/part84/features`
- `/api/part84/modules`
- `/api/part84/roles`
- `/api/part84/permissions`
- `/api/part84/command/parse`
- `/api/part84/action/preview`
- `/api/part84/action/execute`
- `/api/part84/missing-details`
- `/api/part84/ambiguity-check`
- `/api/part84/audit-log`
- `/api/part84/vani/greeting`
- `/api/part84/vani/command`
- `/api/part84/activity`
- `/api/part84/checklist`
- `/api/part84/export`
- `/api/part84/demo`

## Role permissions
Owner can preview and safely execute allowed actions; sensitive actions require owner verification. Branch manager is assigned-branch only. Accountant is finance-only. Teacher is assigned batches/students only. Receptionist/Counsellor is admissions/CRM only. Student is own learning data only. Parent is linked child only. NAXORA Super Admin is platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- Sensitive data is private-screen-first.
- VANI does not guess missing details.
- VANI resolves ambiguous names before action.
- Preview and confirmation required.
- Owner verification required for refund, discount, delete, export and subscription changes.
- Real DB writes are simulation/foundation in this part.
- 3.0 owner-only subscription rule preserved.

## VANI integration
VANI supports command parse, missing detail questions, preview, confirmation and safe execution simulation.

Example commands:
- VANI, new student admission draft banao
- VANI, attendance draft banao
- VANI, fee reminder draft banao
- VANI, homework assignment banao
- VANI, branch summary dikhao

## Testing steps
1. Deploy to Render.
2. Open `/api/part84/status`.
3. Open `/advanced-vani-action-engine`.
4. Click Start VANI.
5. Type or speak a command.
6. Check parse/preview output.
7. Try Confirm Safe Execute.
8. Test sensitive command like fee discount.

## Expected test results
- Status returns success true.
- Page opens.
- VANI greeting works.
- Command parse detects action/module.
- Missing details appear instead of guessing.
- Preview appears before execution.
- Execute requires confirmation token.
- Sensitive action requires owner verification.

## Known limitations
- Real production DB action execution is not connected yet.
- Full module-specific VANI actions start from Part 85.
- Browser mic support depends on browser permission/support.
- Native app packaging pending.

## Pending work
- Part 85 — VANI Admission Assistant
- Part 86 — VANI Fee and Attendance Actions
- Part 87 — VANI Voice Reports
- Part 88 — Hindi/Hinglish VANI Conversation

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–83 are preserved.
