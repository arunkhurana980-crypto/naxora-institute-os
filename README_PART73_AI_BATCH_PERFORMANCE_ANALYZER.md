# NAXORA Institute OS — Part 73 AI Batch Performance Analyzer

## Part number and exact name
Part 73 — AI Batch Performance Analyzer

## Features added
- Weak batch analyzer
- Weak chapter analyzer
- Top student recognition view
- Students needing support list
- Teacher suggestions
- VANI batch-performance command endpoint
- Activity/audit log
- AI Hub link update

## Why each feature was added
Part 73 was added to convert tests, attendance and batch performance signals into practical academic actions. The roadmap defines Part 73 as weak batches, weak chapters, top students, students needing support and teacher suggestions, with the benefit of improving teaching quality and results.

## Problem solved
Institute owners and teachers should not wait until final results to discover batch-level problems. Part 73 highlights risk early and suggests support actions.

## Benefits
### Owner
- Clear weak batch list
- Branch/batch intervention planning
- Teacher support decisions

### Institute
- Better academic quality control
- Higher retention and result improvement

### Teacher
- Chapter-wise and student-wise support focus
- Practical remedial suggestions

### Student
- Timely help without blame-based labels
- Focused weak-chapter support

### Parent
- Better progress context and support plan

## Frontend/UI changes
- `frontend/ai-batch-performance-analyzer.html`
- `frontend/ai-batch-performance-analyzer.css`
- `frontend/ai-batch-performance-analyzer.js`
- `frontend/ai-hub.html` updated with Part 73 card

## Backend changes
- `backend/src/server.js` updated with Part 73 APIs and routes.

## Database changes
No required migration.
Optional MongoDB collection if connected:
- `part73batchperformanceanalyzerlogs`
- optional future data source: `part73batchperformances`

## API changes
- `GET /api/part73/status`
- `GET /api/part73/config`
- `GET /api/part73/features`
- `GET /api/part73/roles`
- `GET /api/part73/batch-performance`
- `GET /api/part73/weak-batches`
- `GET /api/part73/weak-chapters`
- `GET /api/part73/top-students`
- `GET /api/part73/students-needing-support`
- `GET /api/part73/teacher-suggestions`
- `POST /api/part73/vani/command`
- `GET /api/part73/activity`
- `GET /api/part73/checklist`
- `GET /api/part73/export`
- `GET /api/part73/demo`

## Role permissions
- Owner: full batch analysis
- Branch Manager: assigned branch analysis
- Teacher: assigned batch analysis and suggestions
- Receptionist/Counsellor: limited support follow-up context
- Student: own progress summary only
- Parent: linked child progress summary only
- Accountant: limited summary only
- NAXORA Super Admin: logged technical support, not unrestricted daily private access

## Security considerations
- No `.env`
- No secrets or API keys
- No direct grade changes
- No student delete/update actions
- No public loud speaking of sensitive student performance data
- VANI uses private-screen-first response mode for sensitive details
- Export requires owner verification in future enforcement

## VANI integration
Example commands:
- “VANI, weak batches dikhao.”
- “VANI, weak chapters ka analysis do.”
- “VANI, top students dikhao.”
- “VANI, support needing students list dikhao.”
- “VANI, teacher suggestions banao.”

VANI returns preview and audit log. No sensitive action executes directly.

## Testing steps
1. Open `/api/part73/status`.
2. Open `/ai-batch-performance-analyzer`.
3. Open `/api/part73/batch-performance?role=owner`.
4. Open `/api/part73/weak-batches`.
5. Open `/api/part73/teacher-suggestions`.
6. Test VANI POST `/api/part73/vani/command`.

## Expected test results
- Status returns `success: true`.
- Frontend page opens.
- Batch analyzer returns summary, weak batches, weak chapters, top students, support students and teacher suggestions.
- VANI command returns private-screen-first preview.

## Known limitations
- Real AI API not connected yet.
- Real performance schema mapping pending final audit.
- No automatic teacher warning or student status change.

## Pending work
Part 74 — AI Parent Communication and Weekly Summary.

## Setup and environment variables
No new environment variable required.
Existing Render env stays same.

## Preservation of previous features
All previous Part 1–72 routes are preserved. Part 71 and Part 72 routes remain mapped.
