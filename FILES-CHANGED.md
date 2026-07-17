# Files Changed — Part 114

## Backend
- `backend/src/part114-customer-checkout-subscription.js`

## Frontend
- `frontend/customer-subscription-checkout.html`
- `frontend/customer-subscription-checkout.css`
- `frontend/customer-subscription-checkout.js`

## Installer and testing
- `APPLY-PART114.js`
- `APPLY-PART114.cmd`
- `VERIFY-PART114.js`
- `ROLLBACK-PART114.js`
- `ROLLBACK-PART114.cmd`

The installer inserts Part 114 immediately before the Express 404/notFound handler and refuses to continue if Parts 112/113 are still after that handler.
