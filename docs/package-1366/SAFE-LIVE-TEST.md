# Safe Live Test

Real Live Mode charges real money. The adult merchant must supervise the entire test.

1. Keep launch flag false while configuring keys, plans and webhook.
2. Open `/api/part1366/status`.
3. Confirm all readiness fields except launch flag.
4. Confirm the Razorpay Live webhook URL and secret.
5. Set `NAXORA_RAZORPAY_LIVE_LAUNCHED=true`.
6. Deploy.
7. Login as Institute Owner.
8. Open `/live-subscriptions`.
9. Choose the lowest intended commercial plan.
10. Complete Razorpay Checkout only with the adult payer's consent.
11. Confirm Checkout signature verified.
12. Confirm `subscription.activated` or provider reconcile changes status to active.
13. Confirm `/app` plan badge and paid modules update.
14. Check Razorpay Dashboard Transactions and Subscriptions.
15. Check Dashboard Settlements for bank settlement schedule.

Do not send API keys, webhook secret, OTP, card information, CVV or UPI PIN in chat.
