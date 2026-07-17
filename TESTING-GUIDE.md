# Part 121 Testing Guide

## Owner
1. Login from `/login`.
2. Open `/app`.
3. Select Owner Workspace.
4. Confirm Owner name, plan and V3 state.
5. Confirm unified role-account counts.
6. Confirm subscription and Live-launch states.
7. Open Account Access.
8. Open three allowed modules.

## Plan access
- FREE owner: always-available and billing-control modules remain visible.
- Starter/Professional/Business: matching Part 116 modules unlock.
- V3 modules unlock only with active V3_AI entitlement.

## Negative roles
Try direct `/api/part121/overview` with:
- Teacher token.
- Student token.
- Parent token.

Expected: `403 OWNER_ONLY`.

## Model discovery
When a Student/Fee/Attendance model is not institute-scoped, its count must not be included.

## VANI
- `VANI, owner summary dikhao`
- `VANI, kya pending hai?`
- `VANI, account manager kholo`
- `VANI, marketplace kholo`

Denied module must not open.
