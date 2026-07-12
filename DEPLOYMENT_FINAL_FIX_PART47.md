# Part 47 Deployment Final Fix Guide

## Render setup
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`

## Railway setup
- Service root: `backend`
- Start command: `npm start`

## Required Environment Variables
```env
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/naxora_institute_os?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=replace_with_very_long_random_secret_32_chars_minimum
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-live-domain.onrender.com
CORS_ORIGINS=https://your-live-domain.onrender.com
```

## Optional payment variables
```env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

## Post deploy checks
- `/api/health`
- `/api/deployment/status`
- `/api/route-check`
- `/app`
- `/app/deployment.html`
