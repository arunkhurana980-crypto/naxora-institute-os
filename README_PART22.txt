# NAXORA Institute OS — Part 22 Branch Management

Part 22 me multi-branch management add kiya gaya hai.

## New Feature
- Branch Management page
- Main branch / franchise / online / partner branch support
- Branch code, manager, address, city, district, state
- Capacity, current students, current teachers
- Monthly revenue, expense and profit
- Facilities tracking
- Active / planning / inactive / closed status
- Search and filters
- Sidebar me Branches link visible

## New APIs

```txt
GET    /api/branches
POST   /api/branches
GET    /api/branches/:id
PUT    /api/branches/:id
PATCH  /api/branches/:id/status
DELETE /api/branches/:id
```

## Run

```bash
cd backend
npm install
npm run dev
```

Health check:

```txt
http://127.0.0.1:5000/api/health
```

Expected terminal line:

```txt
✅ PART 22 ROUTES ACTIVE: /api/branches
```

## Frontend
Open with Live Server:

```txt
frontend/index.html
```

Flow:

```txt
Login → Dashboard → Branches → Add Branch
```
