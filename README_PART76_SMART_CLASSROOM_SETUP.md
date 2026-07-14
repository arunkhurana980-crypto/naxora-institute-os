# NAXORA Institute OS — Part 76 Smart Classroom Setup Module

## Part number and exact name
Part 76 — Smart Classroom Setup Module

## Features added
- Site Survey
- Hardware Quotation
- Advance Payment Status
- Vendor Details
- Installation Tracking
- Warranty Details
- VANI Smart Classroom commands
- Activity/audit log foundation
- Smart Classroom frontend page
- Part 76 APIs and documentation
- Master Progress Record update

## Why each feature was added
Site Survey captures classroom needs before hardware purchase. Hardware Quotation gives a transparent budget. Advance Payment Status helps decide when work should begin. Vendor Details store installation partner info. Installation Tracking shows progress from survey to training. Warranty Details protect the institute after installation.

## Problem solved
Institutes wanting smart classroom setup often have scattered information: room details, vendor numbers, quotation, advance payment, installation stage and warranty records. Part 76 brings this workflow into NAXORA so the software can also support classroom setup service selling.

## Benefits
Owner: gets clear setup budget, payment status and installation progress.
Institute: can buy software + classroom setup as one managed service.
Teacher: gets reliable camera, audio and live-class environment.
Student: better live/recorded class quality.
Parent: more trust in online/hybrid class delivery.

## Frontend/UI changes
- `frontend/smart-classroom-setup.html`
- `frontend/smart-classroom-setup.css`
- `frontend/smart-classroom-setup.js`

## Backend changes
- `backend/src/server.js` updated with Part 76 config, role rules, survey/quotation generators, VANI command handling and routes.

## Database changes
No required migration.
Optional future collection:
- `part76smartclassroomlogs`

## API changes
- `GET /api/part76/status`
- `GET /api/part76/config`
- `GET /api/part76/features`
- `GET /api/part76/roles`
- `GET /api/part76/site-survey`
- `POST /api/part76/site-survey`
- `GET /api/part76/hardware-quotation`
- `GET /api/part76/advance-payment-status`
- `GET /api/part76/vendor-details`
- `GET /api/part76/installation-tracking`
- `GET /api/part76/warranty-details`
- `POST /api/part76/vani/command`
- `GET /api/part76/activity`
- `GET /api/part76/checklist`
- `GET /api/part76/export`
- `GET /api/part76/demo`

## Role permissions
Owner has full smart classroom setup access. Branch Manager has assigned branch setup access. Accountant can view/record payment status according to permission. Teacher can view assigned classroom status and report issues. Receptionist can view installation schedule and limited vendor contact. Student/Parent can only see class readiness status. NAXORA Super Admin has logged technical support access only.

## Security considerations
- No `.env`, API keys, passwords or secrets included.
- No real payment charge is performed.
- Vendor/payment/export actions require owner verification.
- Refund, discount, deletion, export and subscription changes are blocked without verification.
- VANI does not speak sensitive vendor/payment details loudly; it uses private-screen-first mode.

## VANI integration
VANI commands added:
- “VANI, smart classroom setup status dikhao”
- “VANI, hardware quotation dikhao”
- “VANI, installation stage kya hai?”
- “VANI, warranty details dikhao”

VANI checks role permission, hides sensitive payment/vendor details from public speech, previews status and logs every action.

## Testing steps
1. Open `/api/part76/status`.
2. Open `/smart-classroom-setup`.
3. Open `/api/part76/demo`.
4. Test `/api/part76/hardware-quotation`.
5. Test `/api/part76/installation-tracking`.
6. Test VANI command from page or POST `/api/part76/vani/command`.

## Expected test results
- Status API returns `success: true`.
- Smart Classroom page opens.
- Demo returns survey, quotation, advance payment, vendor, installation and warranty data.
- VANI returns safe private-screen-first preview.

## Known limitations
- Real vendor integration is not connected.
- Real payment charging is not connected here.
- Real warranty claim workflow is pending.
- Hardware purchasing is managed as workflow foundation only.

## Pending work
- Part 77 Final Production Testing.
- Part 78 NAXORA OS 1.0 Production Launch.
- Future 2.0 hardware integrations: biometric, digital board, camera/studio.
- Future 3.0 owner-only AI-first subscription guard.

## Setup and environment-variable instructions
No new environment variables are required. Keep existing Render variables only.

## Complete runnable source-code ZIP
This ZIP preserves previous working features and adds Part 76 files only. It contains no `.env`, no `node_modules`, and no `.bat` script.
