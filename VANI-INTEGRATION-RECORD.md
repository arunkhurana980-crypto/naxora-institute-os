# VANI Integration Record — Part 113

## Example commands
- `VANI, Professional monthly plan price INR 2999 ka preview banao`
- `VANI, Business yearly plan price ₹29999 ka preview banao`
- `VANI, subscription plans dikhao`

## Missing details behaviour
If plan name, period or price is missing, VANI asks for it.

## Safety
- Owner-only.
- instituteId checked.
- Test Mode only.
- Preview before creation.
- Exact confirmation required.
- Provider secrets not spoken.
- Live Mode requests blocked.
- Duplicate creation blocked.

## Current action boundary
VANI prepares the plan preview. Provider creation is completed through the confirmed action using the exact preview confirmation. Customer subscription/checkout remains Part 114.
