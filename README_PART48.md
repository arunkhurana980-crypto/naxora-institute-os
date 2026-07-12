# NAXORA Institute OS — Part 48

## Razorpay Live Payment Final Setup

This build is merged on top of Part 47 and keeps the full integrated NAXORA Institute OS base.

### Added

- Razorpay final readiness dashboard
- Test/live key mode checker
- SaaS subscription payment mapping
- Live Classes add-on payment mapping
- Online Batch fee payment mapping
- VANI AI add-on payment mapping
- Webhook final setup checklist
- Quick payment payload generator
- Mock mode fallback if Razorpay keys are missing

### New pages

- `/app/razorpay-final.html`
- Existing `/app/payments.html` still handles payment records, order creation, checkout and receipts.

### New APIs

- `GET /api/razorpay-final/status`
- `GET /api/razorpay-final/pricing`
- `GET /api/razorpay-final/checklist`
- `POST /api/razorpay-final/quick-payment`
- `GET /api/part48/status`

### Required .env keys

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_here_do_not_share
RAZORPAY_WEBHOOK_SECRET=optional_webhook_secret
RAZORPAY_COMPANY_NAME=NAXORA Institute OS
```

Do not share `RAZORPAY_KEY_SECRET` publicly.

### Run

```bash
taskkill /F /IM node.exe
cd backend
npm install
npm run dev
```

Open:

- `http://127.0.0.1:5000/app/razorpay-final.html`
- `http://127.0.0.1:5000/api/razorpay-final/status`
