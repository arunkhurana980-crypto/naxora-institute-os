# Frontend UI Record — Part 112

## Page
`/razorpay-test-mode-foundation`

Aliases:
- `/razorpay-settings`
- `/part112`

## UI sections
- Public Test Mode status.
- Owner JWT/institute context.
- Environment readiness metrics.
- VANI command box.
- Read-only connection test.
- Setup preview.
- Exact confirmation text.
- Render environment variable names.
- Security checklist.

## Token handling
The page attempts to detect common existing same-origin login token keys. A manually entered token is stored only in `sessionStorage` for the current browser session. The UI never displays Razorpay secrets.
