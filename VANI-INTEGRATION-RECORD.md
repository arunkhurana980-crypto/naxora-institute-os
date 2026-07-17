# VANI Integration Record — Part 117

## Commands
- `VANI, meri subscription status dikhao`
- `VANI, subscription pause karo`
- `VANI, subscription resume karo`
- `VANI, cycle end par cancel karo`
- `VANI, subscription abhi cancel karo`
- `VANI, Business plan me upgrade karo`
- `VANI, Professional plan me downgrade karo`

## Behaviour
- Owner-only.
- Role and instituteId checked.
- Missing Subscription/target plan details asked.
- VANI first creates a preview.
- Exact confirmation is required.
- Private owner verification is required.
- VANI never asks the owner to speak the verification secret.
- Sensitive details remain private-screen-first.
- Live Mode requests are blocked.
- Final state waits for verified webhook.
- Access impact waits for Part 116 recalculation.

## Important
The customer may need to be notified about a plan change. Part 117 requests provider customer notification for plan updates.
