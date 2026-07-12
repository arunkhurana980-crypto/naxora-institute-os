# Deployment Guide - NAXORA Institute OS

## 1. MongoDB Atlas checklist

1. Create/keep your Atlas cluster.
2. Database Access: create a database user.
3. Network Access:
   - For local testing: allow your current IP.
   - For quick testing only: `0.0.0.0/0`.
   - For production, restrict IPs when possible.
4. Copy the MongoDB connection string and put it in `MONGODB_URI`.

## 2. Local final test

```bash
cd backend
npm install
npm run check:env
npm run dev
```

Open:

```text
http://127.0.0.1:5000/api/health
http://127.0.0.1:5000/app
```

## 3. Render deployment

Use these settings:

```text
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

Environment variables:

```env
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-render-app.onrender.com
CORS_ORIGINS=https://your-render-app.onrender.com
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=7d
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_COMPANY_NAME=NAXORA Institute OS
```

After deploy, open:

```text
https://your-render-app.onrender.com/api/health
https://your-render-app.onrender.com/app
```

## 4. Railway/VPS deployment

Start command:

```bash
cd backend && npm install && npm start
```

Set the same environment variables as above.

## 5. Frontend hosting options

### Option A: Same backend server
Use `/app` on the deployed backend. This is easiest.

### Option B: Separate frontend hosting
Host the `frontend` folder on Netlify/Vercel/static hosting, then set:

```env
FRONTEND_URL=https://your-frontend-domain.com
CORS_ORIGINS=https://your-frontend-domain.com
```

Then edit the first line of frontend JS files if needed to use your backend API URL.
