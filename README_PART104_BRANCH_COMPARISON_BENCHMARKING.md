# Part 104 — Branch Comparison and Benchmarking

## Part number and exact name
Part 104 — Branch Comparison and Benchmarking

## Features added
- Branch Comparison and Benchmarking page.
- Branch benchmark scorecard.
- Peer group benchmarking.
- Branch ranking.
- Gap analysis.
- Target preview.
- Best practice recommendations.
- Benchmark action plan draft.
- Role-scoped benchmark summaries.
- Private-screen-first benchmark privacy policy.
- VANI branch benchmarking commands.
- Role-based benchmark access checks.
- Soft calm VANI voice preserved.

## Why each feature was added
Owners need to compare branches fairly, find weak areas, set improvement targets and copy best practices from top branches.

## Problem solved
Part 102 gave command centre overview; Part 104 adds deeper branch benchmarking and action-ready comparison.

## Benefits
Owner: can rank all authorised branches and see gaps.
Institute: can improve weaker branches using benchmark targets.
Branch Manager: can see assigned branch benchmark against peer average.
Teacher: can view academic benchmark summary only.
Student/Parent: can view safe branch quality status only.

## Frontend/UI changes
- `frontend/branch-comparison-benchmarking.html`
- `frontend/branch-comparison-benchmarking.css`
- `frontend/branch-comparison-benchmarking.js`
- `frontend/vani-voice-starter.js` soft calm voice preserved

## Backend changes
- `backend/src/server.js` updated with Part 104 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `branchbenchmarks`
- `branchscorecards`
- `branchbenchmarktargets`
- `branchgapanalysis`
- `branchbestpractices`
- `branchbenchmarkactionplans`
- `branchbenchmarkauditlogs`

## API changes
- `/api/part104/status`
- `/api/part104/config`
- `/api/part104/features`
- `/api/part104/roles`
- `/api/part104/access-check`
- `/api/part104/branches`
- `/api/part104/scorecard`
- `/api/part104/ranking`
- `/api/part104/peer-benchmark`
- `/api/part104/gap-analysis`
- `/api/part104/target-preview`
- `/api/part104/best-practices`
- `/api/part104/action-plan`
- `/api/part104/role-scoped-summary`
- `/api/part104/privacy-policy`
- `/api/part104/vani/greeting`
- `/api/part104/vani/command`
- `/api/part104/audit-log`
- `/api/part104/activity`
- `/api/part104/checklist`
- `/api/part104/export`
- `/api/part104/demo`

## Role permissions
Owner can benchmark all authorised branches. Branch manager can view assigned branch benchmark only. Teacher sees academic benchmark summary only. Accountant sees finance benchmark summary only. Receptionist/counsellor sees enquiry benchmark summary only. Student/parent see branch quality-safe status only. Super Admin has platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- Target changes do not auto-apply.
- Benchmark action plans do not auto-send.
- Benchmark exports require owner verification.
- Branch KPI rule changes require owner verification.
- Sensitive fee/student/staff details are private-screen-first.
- VANI speaks safe summaries only.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, branches rank karo
- VANI, South branch benchmark dikhao
- VANI, branch gap analysis banao
- VANI, next month target preview banao
- VANI, best practices suggest karo
- VANI, benchmark action plan banao

## Testing steps
1. Deploy to Render.
2. Open `/api/part104/status`.
3. Open `/branch-comparison-benchmarking`.
4. Click Start VANI.
5. Ask the sample branch ranking/gap command.
6. Test owner role.
7. Test branch manager assigned-branch role.
8. Test teacher/accountant/receptionist/student/parent scoped roles.

## Expected test results
- Status returns success true.
- Page opens.
- Scorecard appears.
- Ranking appears for owner.
- Peer benchmark appears.
- Gap analysis appears.
- Target preview appears but auto-apply is off.
- Best practices appear.
- Action plan draft appears.
- Sensitive data remains private-screen-first.
- VANI gives safe benchmark summary.

## Known limitations
- Preview/demo branch data only.
- Production branch benchmark persistence pending.
- Real branch target workflow pending.
- Real export workflow pending.
- Benchmark scores are rule-based foundation only.

## Pending work
- Part 105 — Advanced Student Support Analytics
- Production benchmark database persistence
- Real branch target approval workflow
- Cross-branch historical trend comparison
- Owner-verified benchmark exports

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–103 are preserved.
