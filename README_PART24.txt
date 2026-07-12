# NAXORA Institute OS - Part 24
## Lead Follow-up Automation System

Part 24 adds a dedicated follow-up control room for admission leads. It connects with the Part 23 Admission Enquiry CRM and uses the same lead records, follow-up dates and follow-up history.

### Added Features
- Today follow-up queue
- Missed follow-up list
- Upcoming 7-day follow-ups
- Hot lead priority board
- Unscheduled leads board
- Call / WhatsApp / Visit / Demo / Email follow-up log
- Next follow-up date automation
- Snooze lead for 1 day or 3 days
- Mark lead as hot / converted / lost
- Counsellor performance report
- Pipeline value tracking
- Sidebar Follow-ups link

### New Backend APIs
GET    /api/followups
POST   /api/followups/:id/log
PATCH  /api/followups/:id/snooze
PATCH  /api/followups/:id

### New Frontend Files
frontend/followups.html
frontend/followups.css
frontend/followups.js

### Run Steps
1. Copy your working backend/.env file into this part's backend folder.
2. Stop old backend:
   taskkill /F /IM node.exe
3. Run backend:
   cd backend
   npm install
   npm run dev
4. Check backend:
   http://127.0.0.1:5000/api/health
5. Open frontend/index.html with Live Server.
6. Login -> Enquiries add a lead -> Follow-ups page.

### Expected Terminal Line
✅ PART 24 ROUTES ACTIVE: /api/followups
🚀 NAXORA Institute OS: http://localhost:5000
