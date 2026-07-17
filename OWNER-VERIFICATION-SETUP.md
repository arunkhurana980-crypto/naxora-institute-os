# Owner Verification Setup

Complete this with the adult legal merchant account holder.

## Create a private value
Use a long random value that is different from:
- Razorpay Key Secret,
- Razorpay Webhook Secret,
- JWT Secret,
- email or bank password.

## Render
Add:

```text
NAXORA_OWNER_ACTION_SECRET
```

Value must stay private.

## NAXORA UI
The owner enters it only in the private password field before a confirmed Test action.

## Never
- send it in chat,
- speak it to VANI,
- add it to GitHub,
- include it in screenshots,
- save it in frontend source code.
