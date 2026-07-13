# NAXORA Institute OS — Part 62 Compare Institutes

## Purpose
Part 62 adds the Compare Institutes discovery module.

Students and parents can compare nearby/public institutes side-by-side by:

- Fees range
- Distance/location
- Courses/classes
- Results/achievements
- Facilities
- Ratings
- Demo availability
- Verified listing status

## Why this part exists
Part 59 created public institute profiles. Part 60 created enquiry/callback. Part 61 created nearby institute search.

Part 62 connects those into a decision helper:

Nearby Institutes → Compare Institutes → View Profile → Request Callback → CRM follow-up → Admission

## Routes

Frontend:

- `/compare-institutes`
- `/compare`
- `/institute-comparison`
- `/compare-coaching`

APIs:

- `/api/part62/status`
- `/api/part62/config`
- `/api/part62/candidates`
- `/api/part62/compare`
- `/api/part62/matrix`
- `/api/part62/recommendations`
- `/api/part62/checklist`
- `/api/part62/export`
- `/api/part62/demo`

## Safe data rule
Part 62 only compares public listing/profile data. It does not expose private student, fee ledger, attendance or admin data.

## Files added

- `frontend/compare-institutes.html`
- `frontend/compare-institutes.css`
- `frontend/compare-institutes.js`
- `docs/PART62_COMPARE_INSTITUTES_CHECKLIST.md`
- `START_HERE_PART62_ARUN.md`
- `README_PART62_COMPARE_INSTITUTES.md`

## No secrets
This package does not include `.env`, MongoDB URI, JWT secret, Razorpay secret, node_modules or .bat scripts.
