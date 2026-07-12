NAXORA Institute OS - Part 37
Dark / Light Theme System

What is added:
- Dark mode
- Light mode
- System theme auto-detect
- Floating theme switcher on every page
- Theme saved in localStorage
- Settings page theme sync
- Dedicated Theme page: frontend/theme.html
- Backend theme status route: GET /api/theme/status
- Route-check helper includes /api/theme/status

How to run:
1. Copy your working backend/.env into this backend folder.
2. Stop old backend: taskkill /F /IM node.exe
3. cd backend
4. npm install
5. npm run dev
6. Open frontend/index.html with Live Server or open http://127.0.0.1:5000/app

Health checks:
- http://127.0.0.1:5000/api/health
- http://127.0.0.1:5000/api/theme/status
- http://127.0.0.1:5000/api/route-check

If Route not found comes:
You are running old backend. Stop node.exe and run Part 37 backend.
