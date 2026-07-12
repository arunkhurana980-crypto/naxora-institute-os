# NAXORA Institute OS - Part 46

## Full Client Pitch Dashboard

This is an integrated build based on Part 45. It keeps the full Part 1 to Part 45 system and adds a client-facing pitch dashboard for selling NAXORA Institute OS to coaching institutes.

## Added in Part 46

- Client Pitch Dashboard frontend page
- ROI Calculator
- Pricing pitch cards
- Manual vs NAXORA comparison table
- 7-minute sales pitch flow
- Objection-handling answers
- Quick demo links
- Founding institute offer block
- APIs for pitch data and ROI calculation
- Safe mock mode preserved

## New APIs

- GET `/api/client-pitch/status`
- GET `/api/client-pitch`
- POST `/api/client-pitch/roi`
- GET `/api/part46/status`

## Run

```bash
cd backend
npm install
npm run dev
```

Open:

- `http://127.0.0.1:5000/app/client-pitch.html`
- `http://127.0.0.1:5000/api/client-pitch/status`
- `http://127.0.0.1:5000/api/part46/status`

## Notes

If MongoDB is not connected, this build stays in mock mode and does not crash.
