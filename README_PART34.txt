NAXORA Institute OS - Part 34
WhatsApp / SMS Notification Setup

What is added:
- WhatsApp/SMS notification center UI
- Notification campaign model
- Create, edit, filter, delete notification campaigns
- Mock/test send mode
- Provider config check endpoint
- Optional WhatsApp Cloud API, Twilio, MSG91, Fast2SMS env keys
- Route error fix helper included in /api/route-check
- Sidebar me WhatsApp/SMS link visible

New APIs:
GET    /api/notifications/config
GET    /api/notifications
POST   /api/notifications
GET    /api/notifications/:id
PUT    /api/notifications/:id
PATCH  /api/notifications/:id/status
POST   /api/notifications/:id/send-test
DELETE /api/notifications/:id

Run:
1. Copy your working .env into backend/.env
2. taskkill /F /IM node.exe
3. cd backend
4. npm install
5. npm run dev

Success terminal lines:
✅ PART 34 WHATSAPP SMS NOTIFICATIONS BUILD ACTIVE
✅ Notifications route active: /api/notifications
✅ Notification config active: /api/notifications/config
🚀 NAXORA Institute OS: http://localhost:5000

Health check:
http://127.0.0.1:5000/api/health

Frontend:
Open frontend/index.html with Live Server.
Login → Dashboard → WhatsApp/SMS

Important:
Real provider keys blank hain to app MOCK mode me chalega. Isse app crash nahi karega.
