NAXORA Institute OS — Part 28: Payment Integration Structure

What is added:
- Payment records model
- Razorpay/UPI-ready payment structure
- Create payment record
- Create mock/Razorpay-ready order
- Verify payment / test payment
- Payment status tracking: created, pending, paid, failed, refunded, cancelled
- Receipt number auto-generate
- Receipt preview API
- Webhook-ready endpoint
- Frontend Payments page
- Sidebar Payments link visible
- Dashboard payment stats

Backend APIs:
GET    /api/payments
POST   /api/payments
GET    /api/payments/config
GET    /api/payments/:id
PUT    /api/payments/:id
PATCH  /api/payments/:id/status
POST   /api/payments/:id/order
POST   /api/payments/:id/verify
GET    /api/payments/:id/receipt
POST   /api/payments/webhook
DELETE /api/payments/:id

Run:
1. Copy your working .env into backend/.env
2. taskkill /F /IM node.exe
3. cd backend
4. npm install
5. npm run dev

Health check:
http://127.0.0.1:5000/api/health

Expected terminal line:
✅ PART 28 ROUTES ACTIVE: /api/payments

Frontend:
Open frontend/index.html with Live Server
Login → Dashboard → Payments

Razorpay keys are optional in this build.
If keys are blank, the app creates a safe test/mock order so the frontend will not crash.
