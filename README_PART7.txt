NAXORA Institute OS - Part 7: Fees & Payment Management

What is new:
- Fee model
- Add fee record
- View fee records
- Update fee record
- Delete fee record
- Paid / pending / partial / overdue status
- Discount and pending amount calculation
- Payment mode: cash, UPI, bank, card, other
- Receipt preview and print
- Dashboard fee stats
- Protected APIs with JWT

APIs:
GET    /api/fees
POST   /api/fees
GET    /api/fees/:id
PUT    /api/fees/:id
DELETE /api/fees/:id

Run:
1. Copy your working backend/.env file into this backend folder.
2. Stop old Node server: taskkill /F /IM node.exe
3. cd backend
4. npm install
5. npm run dev
6. Check: http://127.0.0.1:5000/api/health
7. Open frontend/index.html with Live Server.
