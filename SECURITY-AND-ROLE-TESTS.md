# Security and Role Tests — Part 119

## Mandatory
- Parts 112–119 appear before the Express 404 handler.
- `/app` loads without JavaScript syntax errors.
- Private navigation without JWT returns 401.
- instituteId mismatch returns 403.
- Teacher cannot open owner billing modules.
- Student cannot open fee-management module.
- Parent cannot open branch command centre.
- Owner without Business entitlement cannot open Marketplace.
- Owner without V3 cannot open owner AI.
- Arbitrary module key returns 404.
- Browser cannot send an arbitrary external URL.
- VANI refuses sensitive credential requests.
- VANI denied module does not open.
- Mobile sidebar opens/closes.
- Browser back/forward updates shell module state.
