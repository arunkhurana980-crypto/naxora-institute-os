# NAXORA Institute OS — Part 63 Discovery and Leads Integration

## Goal
Part 63 ka goal public profiles, nearby search, comparison, enquiries aur follow-ups ko ek connected student-to-admission journey banana hai.

## What changed
- `/discovery-leads-integration` page added
- `/discovery-journey`, `/admission-journey`, `/lead-integration` alternate routes added
- `/api/part63/status`
- `/api/part63/config`
- `/api/part63/journey`
- `/api/part63/funnel`
- `/api/part63/lead-map`
- `/api/part63/profile/:profileId/journey`
- `/api/part63/recommend-next-actions`
- `/api/part63/connect`
- `/api/part63/checklist`
- `/api/part63/export`
- `/api/part63/demo`

## Connected flow
Public Profile → Nearby Search → Compare Institutes → Request Callback → CRM Follow-Up → Admission Conversion.

## Safety
No `.env`, no secrets, no node_modules, no external SMS/WhatsApp/email sending. Public discovery APIs expose only public-safe institute data and consent-based lead journey metadata.
