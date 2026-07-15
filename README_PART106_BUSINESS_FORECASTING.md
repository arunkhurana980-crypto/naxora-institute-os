# Part 106 — Business Forecasting

## Part number and exact name
Part 106 — Business Forecasting

## Features added
- Business Forecasting page.
- Admission forecast.
- Revenue forecast.
- Expense and cashflow forecast.
- Capacity forecast.
- Risk forecast.
- Scenario planning.
- Forecast action plan draft.
- Role-scoped business forecast summaries.
- Private-screen-first forecasting privacy policy.
- VANI business forecasting commands.
- Role-based forecasting access checks.
- Soft calm VANI voice preserved.

## Why each feature was added
Institute owners need planning support for admissions, revenue, expenses, capacity and business risks.

## Problem solved
Business planning was scattered across leads, fees, staff capacity and branch performance. Part 106 gives a single forecast dashboard.

## Benefits
Owner: can forecast admissions, revenue, cashflow, risk and action steps.
Institute: can plan batches, hiring, fees and marketing earlier.
Branch Manager: can see assigned branch forecast summary.
Teacher: can see capacity/workload forecast only.
Student/Parent: see only service-safe updates, not business details.

## Frontend/UI changes
- `frontend/business-forecasting.html`
- `frontend/business-forecasting.css`
- `frontend/business-forecasting.js`
- `frontend/vani-voice-starter.js` soft calm voice preserved

## Backend changes
- `backend/src/server.js` updated with Part 106 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `businessforecasts`
- `admissionforecasts`
- `revenueforecasts`
- `cashflowforecasts`
- `capacityforecasts`
- `forecastscenarios`
- `businessrisks`
- `forecastactionplans`
- `forecastauditlogs`

## API changes
- `/api/part106/status`
- `/api/part106/config`
- `/api/part106/features`
- `/api/part106/roles`
- `/api/part106/access-check`
- `/api/part106/overview`
- `/api/part106/admission-forecast`
- `/api/part106/revenue-forecast`
- `/api/part106/cashflow-forecast`
- `/api/part106/capacity-forecast`
- `/api/part106/risk-forecast`
- `/api/part106/scenario-planning`
- `/api/part106/action-plan`
- `/api/part106/role-scoped-summary`
- `/api/part106/privacy-policy`
- `/api/part106/vani/greeting`
- `/api/part106/vani/command`
- `/api/part106/audit-log`
- `/api/part106/activity`
- `/api/part106/checklist`
- `/api/part106/export`
- `/api/part106/demo`

## Role permissions
Owner can view full authorised forecast and create scenarios/action previews. Branch manager can view assigned branch summary. Accountant can view finance/cashflow summary. Counsellor can view admission forecast summary only. Teacher can view capacity/workload forecast only. Student/parent can view service-safe updates only. Super Admin has platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- Forecast is preview only, not financial advice.
- No guarantees.
- No auto budget change.
- No auto target change.
- No auto campaign budget apply.
- Sensitive financial details are private-screen-first.
- VANI speaks safe summaries only.
- Financial export/budget/target/campaign changes require owner verification.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, business forecast overview dikhao
- VANI, next 30 days admission forecast banao
- VANI, revenue forecast dikhao
- VANI, cashflow risk batao
- VANI, capacity forecast dikhao
- VANI, forecast action plan banao

## Testing steps
1. Deploy to Render.
2. Open `/api/part106/status`.
3. Open `/business-forecasting`.
4. Click Start VANI.
5. Ask the sample revenue/cashflow command.
6. Test owner role.
7. Test branch manager, accountant, counsellor, teacher, student and parent scoped roles.

## Expected test results
- Status returns success true.
- Page opens.
- Admission forecast appears.
- Revenue/cashflow forecast appears for allowed roles.
- Capacity forecast appears.
- Risk forecast appears.
- Scenario planning does not auto-apply targets.
- Action plan draft does not auto-send.
- Sensitive financial data remains private-screen-first.
- VANI gives safe forecast summary.

## Known limitations
- Preview/demo business data only.
- Production forecasting database persistence pending.
- Real historical trend model pending.
- Real budget/target approval workflow pending.
- Forecast is rule-based foundation only.

## Pending work
- Part 107 — Automated Marketing System
- Production forecast persistence
- Historical trend forecasting
- Owner-verified budget/target changes
- Marketing ROI integration

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–105 are preserved.
