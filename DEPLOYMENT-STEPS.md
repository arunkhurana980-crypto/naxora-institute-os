# Deployment Steps — Part 127

```powershell
node .\VERIFY-PART126.js
node --check .\backend\src\server.js
node .\APPLY-PART127.js
node .\VERIFY-PART127.js
git status
git add .
git commit -m "Add Part 127 Final Demo Acceptance and Project Freeze"
git push
```

Render:

```text
Manual Deploy
→ Clear build cache & deploy
```

Build:

```bash
cd backend && npm install --no-audit --no-fund --legacy-peer-deps
```

Start:

```bash
cd backend && node src/server.js
```

After deploy:
1. Check `/api/part127/status`.
2. Login as Owner.
3. Open `/final-acceptance`.
4. Import demo data.
5. Test role accounts.
6. Run acceptance.
7. Freeze release.
8. Download account map and manifest.
