NAXORA Institute OS - Part 15: Expense & Income Management System

New module:
- FinanceRecord model
- Income records
- Expense records
- Salary/rent/electricity/marketing/software/stationery categories
- Payment mode, reference no, recurring flag
- Total income, total expense, net profit/loss, pending amount
- Protected API with JWT

APIs:
GET    /api/finance
POST   /api/finance
GET    /api/finance/:id
PUT    /api/finance/:id
PATCH  /api/finance/:id/status
DELETE /api/finance/:id

Run:
1. Copy your working backend/.env into this backend folder.
2. taskkill /F /IM node.exe
3. cd backend
4. npm install
5. npm run dev

Health check:
http://127.0.0.1:5000/api/health

Frontend:
Open frontend/index.html with Live Server, then Login -> Dashboard -> Finance.
