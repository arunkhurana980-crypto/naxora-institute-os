# Deployment Steps — Part 120

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART120.js
node .\VERIFY-PART120.js
git status
git add .
git commit -m "Add Part 120 Common Login JWT and Role Routing"
git push
```

Render build/start commands stay unchanged.

Verify private variables:
- `JWT_SECRET`
- `NAXORA_OWNER_ACTION_SECRET`

Render → Manual Deploy → Clear build cache & deploy.

## Smoke tests
1. `/api/part120/status`
2. `/login`
3. Adopt one valid existing owner session.
4. Login through `/login`.
5. Confirm redirect to `/app`.
6. Open Account Access Manager.
7. Create a Teacher account.
8. Login as Teacher with temporary password.
9. Change password.
10. Confirm Teacher receives Teacher-safe Part 119 navigation.
