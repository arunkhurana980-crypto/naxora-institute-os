# Part 115 Testing Guide

## Basic route test
- `/api/part115/status`
- `/api/part115/security-policy`
- `/webhook-monitor`

## Real Test Mode event flow
1. Configure the Test webhook in Razorpay Dashboard.
2. Complete a Part 114 Test Subscription authorisation.
3. Expected event: `subscription.authenticated`.
4. Depending on timing, `subscription.activated` may follow.
5. Open webhook monitor → Load Events.
6. Open webhook monitor → Load Sync States.
7. The matching Part 114 local Subscription should show the verified provider status.

## Charge testing
Use Razorpay Test Subscription controls to simulate successful and failed recurring charges.
- Successful charge should produce `subscription.charged`.
- Failed charge can move the Subscription to `pending`.
- Exhausted retries can move it to `halted`.

## Duplicate test
Razorpay may retry the same event. The unique event ID should prevent double processing.

## Manual reconcile
Copy the local Part 114 Subscription MongoDB ID into the monitor and run Reconcile. This uses Razorpay Test API fetch as a safe fallback; it does not unlock features.

## Part boundary
Even when status becomes active/authenticated, `featureAccessUnlocked` remains false until Part 116.
