# START HERE — Part 120

## Exact name
**Part 120 — Common Login, JWT Session and Automatic Role Routing**

## Main URLs

```text
/login
/app
/account-access-manager
```

## First account migration
Part 120 does not guess or copy old password hashes.

A user who is already signed in through a valid old role login can:
1. Open `/login`.
2. Choose the existing-session migration option.
3. Enter a common Login ID and a new password.
4. Create a Part 120 unified identity.
5. Continue to `/app`.

The institute owner then creates Teacher, Student, Parent, Branch Manager, Accountant, Counsellor and Staff accounts from `/account-access-manager`.

## Install

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART120.js
node .\VERIFY-PART120.js
```

## Git

```powershell
git status
git add .
git commit -m "Add Part 120 Common Login JWT and Role Routing"
git push
```

Render → Manual Deploy → Clear build cache & deploy.

## Environment
Keep private:
- `JWT_SECRET`
- `NAXORA_OWNER_ACTION_SECRET`

No user password belongs in `.env`, GitHub, chat or screenshots.
