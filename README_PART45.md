# NAXORA Institute OS — Part 45 Final Sales Demo Mode

Part 45 is merged on top of the Part 44 integrated full build. It is not a standalone mini project.

## Added

- Final Sales Demo Mode page
- One-click demo personas
- Institute Owner demo
- Student demo
- Parent demo
- Super Admin demo
- 5–7 minute walkthrough script
- Client pitch-ready dashboard data
- Demo token dashboard intercept
- Route checks for `/api/demo-mode/*`

## Run

```bash
taskkill /F /IM node.exe
cd backend
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5000/app/demo-mode.html
http://127.0.0.1:5000/api/demo-mode/status
```

## Demo flow

1. Open Sales Demo Mode
2. Click Institute Owner Demo
3. Dashboard opens with demo stats
4. Use walkthrough buttons to show Students, Fees, Discovery Leads, Live Classes, Online Batch Access, Subscriptions, Analytics

## Notes

Demo login is safe and not a real password login. It stores a temporary demo token in localStorage.
