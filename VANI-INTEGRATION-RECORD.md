# VANI Integration Record — Part 121

## Owner commands
- `VANI, owner summary dikhao`
- `VANI, aaj kya pending hai?`
- `VANI, account manager kholo`
- `VANI, fees kholo`
- `VANI, subscription manager kholo`
- `VANI, marketplace kholo`
- `VANI, VANI 3 kholo`

## Security
- Owner JWT required.
- instituteId must match.
- Part 116 entitlement checked.
- Sensitive credential requests are blocked.
- Module routes come from a server allowlist.
- Part 121 VANI performs summary and navigation only.

Part 125 will use `getPart121OwnerOverview` for cross-module multi-step VANI actions.
