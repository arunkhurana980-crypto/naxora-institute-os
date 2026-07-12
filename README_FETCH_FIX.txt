NAXORA Institute OS Part 3 - Fetch Fixed

1. backend/.env file apni old working .env se copy karo.
2. Terminal:
   cd backend
   npm install
   npm run dev
3. Check:
   http://127.0.0.1:5000/api/health
4. Frontend:
   frontend/index.html ko Live Server se open karo.

Fixes included:
- Frontend API changed to http://127.0.0.1:5000/api
- Backend CORS/manual headers fixed for local development
