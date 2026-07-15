# Part 90 — AI Course Recommendation

## Part number and exact name
Part 90 — AI Course Recommendation

## Features added
- AI Course Recommendation page.
- Course catalog foundation.
- Student profile parser.
- Missing detail questions.
- Course match scoring.
- Top 3 course recommendations.
- Batch fit preview.
- Fee fit preview.
- Demo plan preview.
- Explainable recommendation.
- VANI Course Recommendation commands.
- Role-based access checks.

## Why each feature was added
Institutes need a consistent way to recommend the right course based on student class, subject, goal, budget and timing.

## Problem solved
Course suggestions were manual and inconsistent. Part 90 gives explainable recommendations while avoiding unsafe promises.

## Benefits
Owner: course counselling becomes consistent.
Institute: better conversion and fit.
Teacher: academic fit is clearer.
Student: gets a course aligned with need.
Parent: understands why a course is suggested.

## Frontend/UI changes
- `frontend/ai-course-recommendation.html`
- `frontend/ai-course-recommendation.css`
- `frontend/ai-course-recommendation.js`

## Backend changes
- `backend/src/server.js` updated with Part 90 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `coursecatalogs`
- `courserecommendationlogs`
- `studentcoursefitprofiles`
- `demoPlanPreviews`

## API changes
- `/api/part90/status`
- `/api/part90/config`
- `/api/part90/features`
- `/api/part90/roles`
- `/api/part90/access-check`
- `/api/part90/course-catalog`
- `/api/part90/profile/parse`
- `/api/part90/recommendation/generate`
- `/api/part90/batch-fit`
- `/api/part90/fee-fit-preview`
- `/api/part90/demo-plan`
- `/api/part90/explanation`
- `/api/part90/vani/greeting`
- `/api/part90/vani/command`
- `/api/part90/audit-log`
- `/api/part90/activity`
- `/api/part90/checklist`
- `/api/part90/export`
- `/api/part90/demo`

## Role permissions
Owner, branch manager and receptionist/counsellor can generate counselling recommendations. Teacher/accountant get preview-only access. Student/parent get safe recommendation only. Super Admin has platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- No external LLM/API keys included.
- Missing details are asked, not guessed.
- No marks/result guarantee.
- Fee fit is preview-only.
- Demo plan is preview-only.
- Final admission/demo/fee commitment needs confirmation.
- Discount/refund/delete/export need owner verification.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, Aman Class 10 Maths board exam ke liye course recommend karo budget 3500
- VANI, Riya Class 11 Physics JEE ke liye best course batao
- VANI, English communication ke liye course recommend karo
- VANI, weak maths revision ke liye batch suggest karo

## Testing steps
1. Deploy to Render.
2. Open `/api/part90/status`.
3. Open `/ai-course-recommendation`.
4. Click Start VANI.
5. Ask the sample course recommendation command.
6. Test missing detail command.
7. Test safe-only student/parent roles.

## Expected test results
- Status returns success true.
- Page opens.
- Top 3 recommendations appear.
- Batch fit and fee fit preview appear.
- Demo plan preview appears.
- Missing details appear when needed.
- Final admission/fee actions are not executed.

## Known limitations
- Rule-based foundation only, not external LLM.
- Production DB write is not enabled.
- Real course catalog admin UI pending.
- Browser mic support depends on browser permission/support.

## Pending work
- Part 91 — Fee and Batch Information Assistant
- Production course catalog persistence
- Real batch availability integration
- Optional LLM integration through Render env only

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–89 are preserved.
