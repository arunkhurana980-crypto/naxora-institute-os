# Deployment Steps

```powershell
node .\VERIFY-PART136.js
node --check .\backend\src\server.js
node .\APPLY-PART1361.js
node .\VERIFY-PART1361.js
git status
git add .
git commit -m "Add Part 136.1 First Owner Bootstrap Hotfix"
git push
```

Render:

```text
Environment
→ Add NAXORA_OWNER_BOOTSTRAP_SECRET privately
→ Save Changes
→ Manual Deploy
→ Clear build cache & deploy
```

Test:

- `/login`
- `/common-login`
- `/owner-bootstrap`
- `/api/part1361/status`
- `/app`
- `/vani-acceptance`
