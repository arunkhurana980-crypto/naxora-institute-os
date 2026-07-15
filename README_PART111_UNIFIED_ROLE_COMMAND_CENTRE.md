# Part 111 — Unified Role Command Centre + Demo Data Seeder + Global VANI

## Part number and exact name
Part 111 — Unified Role Command Centre + Demo Data Seeder + Global VANI

## Features added
- Unified Role Command Centre page.
- Owner, Teacher, Student, Parent, Branch Manager, Counsellor and Accountant role dashboards.
- One Global VANI command box.
- Demo data seeder preview.
- Role-safe demo views.
- Role-based module launcher.
- No separate part links required for demo flow.
- Owner-only demo seed controls.
- VANI command routing by role.
- Security policy for private-screen-first role dashboards.
- NAXORA OS 3.0 foundation step 1.

## Why each feature was added
Owner/demo flow was not practical because modules were spread across separate pages. Part 111 creates one central app experience where each role gets a single dashboard and Global VANI.

## Problem solved
Demo/sales flow can now start from one link instead of asking owners, teachers, students and parents to open separate Part links.

## Benefits
Owner: full institute demo, module launcher, demo data seeder, Global VANI.
Teacher: assigned batches/students/classes only.
Student: own timetable, attendance, assignments, tests and revision.
Parent: linked child data only.
Branch Manager: assigned branch only.
Counsellor: admissions/CRM only.
Accountant: finance-safe dashboard only.

## Frontend/UI changes
- `frontend/unified-role-command-centre.html`
- `frontend/unified-role-command-centre.css`
- `frontend/unified-role-command-centre.js`
- `frontend/vani-voice-starter.js` preserved

## Backend changes
- `backend/src/server.js` updated with Part 111 APIs and routes.

## Database changes
No mandatory migration in Part 111. Demo seeder is preview-first.
Future Part 112 will add real demo persistence.

## API changes
- `/api/part111/status`
- `/api/part111/config`
- `/api/part111/roles`
- `/api/part111/module-map`
- `/api/part111/access-check`
- `/api/part111/dashboard`
- `/api/part111/demo-data/preview`
- `/api/part111/demo-data/seed-confirm-preview`
- `/api/part111/security-policy`
- `/api/part111/privacy-policy`
- `/api/part111/vani/greeting`
- `/api/part111/vani/command`
- `/api/part111/role-scoped-summary`
- `/api/part111/audit-log`
- `/api/part111/activity`
- `/api/part111/checklist`
- `/api/part111/export`
- `/api/part111/demo`

## Role permissions
Owner can view all modules and preview demo data seed. Teacher sees assigned academic modules only. Student sees own learning modules only. Parent sees linked child modules only. Branch Manager sees assigned branch modules only. Counsellor sees admission/CRM modules only. Accountant sees finance-safe modules only. NAXORA Super Admin remains platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- Demo seed owner-only.
- No real payment in demo seed.
- No real WhatsApp/SMS/email send in demo seed.
- No destructive production migration.
- Sensitive student/fee/domain/provider/export data is private-screen-first.
- Owner verification required for seed execute, exports, delete, bulk send, live payment, white-label/domain and subscription changes.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, full demo institute setup karo
- VANI, owner dashboard dikhao
- VANI, teacher dashboard dikhao
- VANI, student dashboard dikhao
- VANI, parent dashboard dikhao
- VANI, module launcher dikhao
- VANI, security policy batao

## Testing steps
1. Deploy to Render.
2. Open `/api/part111/status`.
3. Open `/unified-role-command-centre`.
4. Select Owner and click Demo Data Preview.
5. Switch Teacher, Student, Parent, Branch Manager, Counsellor, Accountant.
6. Ask VANI role commands.
7. Verify owner-only modules are hidden from non-owner roles.

## Expected test results
- Status returns success true.
- Page opens.
- Owner dashboard shows all modules.
- Non-owner dashboards hide owner modules.
- Demo seed preview is owner-only.
- Global VANI responds based on selected role.
- Module launcher changes by role.
- Sensitive actions show owner verification requirement.

## Known limitations
- Demo data seed is preview-first only in Part 111.
- Real database seed persistence pending.
- Existing separate pages still exist; Part 111 centralises launcher and role dashboards.
- Real login/JWT role auto-detection merge pending.
- Real sidebar injection into old role pages pending.

## Pending work
- Part 112 — Real Demo Data Persistence and Role-Based Navigation Merge.
- Real MongoDB demo seeding.
- Login-based automatic role redirect.
- Owner dashboard sidebar merge.
- Role dashboards connected to persistent seed records.

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–110 are preserved.
