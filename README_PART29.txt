NAXORA Institute OS — PART 29
Security, Validation & Error Fixing System

New in this part:
- Security Control page: frontend/security.html
- Backend route: /api/security/status
- Public debug helper: /api/security/debug
- Secure HTTP headers
- Basic local rate limiter
- Input body sanitizer
- Signup/login email and password validation
- Better route-not-found message with hints
- Better duplicate record / validation / invalid MongoDB ID errors
- Environment health checker without exposing secrets
- Sidebar Security link visible

Run:
1. Copy your working backend/.env file into this backend folder.
2. taskkill /F /IM node.exe
3. cd backend
4. npm install
5. npm run dev

Expected terminal:
✅ PART 29 ROUTES ACTIVE: /api/security
🛡️ Security headers, validation, rate-limit and safe errors active
🚀 NAXORA Institute OS: http://localhost:5000

Health check:
http://127.0.0.1:5000/api/health

Security page:
Login → Dashboard → Security

If Failed to fetch comes:
- Open http://127.0.0.1:5000/api/health
- Ensure backend is Part 29
- Ensure frontend JS uses http://127.0.0.1:5000/api
- Logout and login again if token is old

Security note:
Do not share MongoDB password, JWT secret, or Razorpay key secret in screenshots.
