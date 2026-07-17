# Razorpay Dashboard Setup — Part 112

Complete with an adult legal account holder because KYC and settlement bank ownership are legal/financial responsibilities.

## Dashboard steps
1. Create/login to Razorpay merchant account.
2. Complete real KYC and settlement bank setup.
3. Switch Dashboard to **Test Mode**.
4. Open Account & Settings → API Keys.
5. Generate Test Mode keys.
6. Save Key ID and Key Secret privately.
7. Add the values only in Render Environment.
8. Do not create live plans or customer subscriptions yet.
9. Do not add a webhook URL until the webhook endpoint is implemented and verified in the later webhook part.

## Render values
- `RAZORPAY_MODE=test`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

## Security
Never send the Key Secret in ChatGPT, email, WhatsApp or screenshots. Never commit it to GitHub.
