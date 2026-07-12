# Environment Setup Guide

Create this file:

```text
backend/.env
```

Use this template:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://127.0.0.1:5500
CORS_ORIGINS=
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/naxora_institute_os?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=replace_this_with_a_long_random_secret_32_chars_minimum
JWT_EXPIRES_IN=7d
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_COMPANY_NAME=NAXORA Institute OS
```

## Common errors

### Failed to fetch
Backend is not running, wrong backend URL, CORS origin mismatch, or backend crashed.

### Route not found
Wrong/old backend is running. Use:

```bash
taskkill /F /IM node.exe
npm run dev
```

### MongoDB connection failed
Check Atlas URI, database user, password, and Network Access IP allowlist.

### Razorpay not working
Check `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Test keys begin with `rzp_test_`.


## Part 31
AI Notes Generator added. No external AI key required for local template notes generation.
