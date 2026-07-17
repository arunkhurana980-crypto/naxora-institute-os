# START HERE — Part 123

## Exact name
**Part 123 — Student Module Consolidation**

## Main result
Part 119’s Student module now opens:

```text
/student-workspace
```

Student Workspace consolidates:
- learning summary,
- Student-linked classes/enrolments,
- assignments/homework,
- attendance records,
- fee/receipt records,
- results/exams,
- live classes,
- AI class notes,
- Student VANI,
- workspace health and activity.

The old `/student-app` route is not deleted.

## Data safety
Student mode counts a record only when:
1. the model has an institute/tenant field, and
2. the model has a recognised Student field matching a reference from the logged-in JWT.

Safe references can include:
- Part 120 identity/user ID,
- legacy `studentId`,
- learner/profile/admission/enrolment ID from a compatible JWT.

No safe mapping means `Not linked`.

## Install

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART123.js
node .\VERIFY-PART123.js
```

## Git

```powershell
git status
git add .
git commit -m "Add Part 123 Student Module Consolidation"
git push
```

Render → Manual Deploy → Clear build cache & deploy.
