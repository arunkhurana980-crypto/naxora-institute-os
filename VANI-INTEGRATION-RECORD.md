# VANI Integration Record — Part 112

## Commands
- `VANI, Razorpay setup status dikhao`
- `VANI, setup me kya pending hai?`
- `VANI, Razorpay test connection check karo`
- `VANI, setup confirm karo`
- `VANI, live mode start karo`

## Behaviour
- Owner login required.
- Valid instituteId required.
- Provider secrets are private-screen-only.
- Setup command produces status/preview.
- Confirmation command does not silently save; exact confirmation is required through the confirmation endpoint/UI.
- Connection test is read-only.
- Live Mode request is blocked.
- Sensitive secret request is blocked and audited.
- VANI speaks only a safe summary.

## Action levels
- Level 1: status/readiness/checklist.
- Level 2: setup preview.
- Level 3: exact owner confirmation saves only the Test Mode configuration record.

No real payment action exists in Part 112.
