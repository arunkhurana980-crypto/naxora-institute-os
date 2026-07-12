# NAXORA Institute OS — Part 27: Institute Settings System

Part 27 adds a complete Institute Settings module to manage brand identity, institute contact details, academic year, receipt settings, certificate settings, ID prefixes, default attendance/fees rules, and basic automation flags.

## Run

1. Copy your working `backend/.env` into this part's `backend` folder.
2. Stop old Node servers:
   ```bash
   taskkill /F /IM node.exe
   ```
3. Run backend:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
4. Open frontend with Live Server:
   ```text
   frontend/index.html
   ```

## Health check

Open:

```text
http://127.0.0.1:5000/api/health
```

Expected part:

```text
Part 27 - Institute Settings
```

## New API routes

```text
GET   /api/settings
PUT   /api/settings
PATCH /api/settings/branding
POST  /api/settings/reset
```

## Frontend flow

```text
Login → Dashboard → Settings → Save Institute Settings
```

## Important

If `Route not found: GET /api/settings` appears, the old backend is running. Stop Node with `taskkill /F /IM node.exe`, then run Part 27 backend again.
