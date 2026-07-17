# START HERE — Part 112

## Exact part name
**Part 112 — Razorpay Test Mode Foundation**

## Important truth
Part 112 real payment, checkout ya customer subscription start nahi karta. Yeh secure Test Mode foundation, environment validation, owner-only APIs, MongoDB foundation records, VANI setup assistant aur read-only connection test add karta hai.

## Copy and apply
1. ZIP extract karo.
2. ZIP ke andar ki saari files apne live project root me copy/paste/replace karo:
   `C:\Users\bhaij\OneDrive\Documents\naxora-institute-os-part51-final-secure-clean-url-redirect-fixed`
3. VS Code me wahi project folder kholo.
4. Terminal me pehle yeh extra command run karo:

```bash
node APPLY-PART112.js
```

Expected output: `PART 112 APPLIED SUCCESSFULLY` aur `Syntax check: PASS`.

5. Phir normal commands:

```bash
git status
git add .
git commit -m "Add Part 112 Razorpay Test Mode Foundation"
git push
```

6. Render → Manual Deploy → **Clear build cache & deploy**.

## Render Environment variables
Render service → Environment me add karo. Real values chat, screenshot, ZIP ya GitHub me mat daalna.

```env
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_private_webhook_secret
NAXORA_PUBLIC_BASE_URL=https://naxora-institute-os.onrender.com
```

Razorpay Key ID `rzp_test_` se start honi chahiye.

## Test URLs
- `/api/part112/status`
- `/api/part112/security-policy`
- `/api/part112/checklist`
- `/api/part112/demo`
- `/razorpay-test-mode-foundation`

Protected owner tests ke liye existing owner login JWT required hoga.

## First safe test
1. `/api/part112/status` kholo.
2. `testModeLocked: true` verify karo.
3. `realMoneyCollectionEnabled: false` verify karo.
4. Owner login karo.
5. `/razorpay-test-mode-foundation` kholo.
6. `Detect Existing Token` dabao.
7. `Load Owner Readiness` dabao.
8. Keys Render me add karne ke baad `Test Connection` dabao.

## Never share
- Razorpay Key Secret
- Webhook Secret
- JWT token
- Password/OTP
- PAN/Aadhaar/bank details

Razorpay KYC/bank setup adult legal account holder ke saath complete karo.
