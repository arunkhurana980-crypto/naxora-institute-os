# NAXORA Institute OS — Part 44 Integrated Master Bug Fix + Demo Data Seeder

This build is based on Part 43 integrated full build and adds master debugging, route checking, safe mock mode, and demo data seeding.

## Run

```bash
cd backend
npm install
npm run dev
```

## Check URLs

- http://127.0.0.1:5000/api/health
- http://127.0.0.1:5000/api/route-check
- http://127.0.0.1:5000/api/system/debug
- http://127.0.0.1:5000/api/features
- http://127.0.0.1:5000/api/demo-data/status
- http://127.0.0.1:5000/app/system-debug.html

## Seed Demo Data

Open System Debug page and click **Seed Demo Data** or call:

```bash
curl -X POST http://127.0.0.1:5000/api/demo-data/seed -H "Content-Type: application/json" -d "{}"
```

If MongoDB is not connected, the server stays alive in mock mode and returns preview data instead of crashing.
