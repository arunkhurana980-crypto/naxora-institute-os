NAXORA Institute OS - Part 28 Razorpay Live Integration

Added:
- razorpay npm package
- Real Razorpay order creation when keys are present
- Razorpay Checkout button on frontend
- Signature verification using RAZORPAY_KEY_SECRET
- Webhook signature-ready backend using RAZORPAY_WEBHOOK_SECRET
- Mock order fallback when keys are missing

ENV keys:
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=optional_webhook_secret
RAZORPAY_COMPANY_NAME=NAXORA Institute OS

Run:
cd backend
npm install
npm run dev

Frontend:
Open frontend/index.html with Live Server.
Login -> Payments -> Add Payment Record -> Save Payment -> Pay Razorpay.
