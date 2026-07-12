# NAXORA Institute OS — Part 16

## Staff Management System

Part 16 me receptionist, accountant, counsellor, office admin, support staff, marketing, security aur cleaning staff ke records add kiye gaye hain.

### New Features

- Add / view / update / delete staff members
- Staff role, department, shift, joining date
- Salary amount + paid / pending / partial status
- Daily attendance quick status: present / late / absent / leave
- Emergency contact, address, notes
- Dashboard staff stats
- Sidebar me Staff link add
- Protected JWT APIs

### New API Routes

```txt
GET    /api/staff
POST   /api/staff
GET    /api/staff/:id
PUT    /api/staff/:id
PATCH  /api/staff/:id/status
DELETE /api/staff/:id
```

### Run

1. `backend/.env.example` ko `.env` me copy karo.
2. Apna MongoDB URI paste karo.
3. Terminal:

```bash
cd backend
npm install
npm run dev
```

Health check:

```txt
http://127.0.0.1:5000/api/health
```

Terminal me ye line aani chahiye:

```txt
✅ PART 16 ROUTES ACTIVE: /api/staff
```

Frontend:

```txt
frontend/index.html
```

Live Server se open karo, login karo, phir sidebar me `Staff` open karo.
