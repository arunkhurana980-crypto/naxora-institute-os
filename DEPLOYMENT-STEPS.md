# Deployment Steps — Part 123

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART123.js
node .\VERIFY-PART123.js
git status
git add .
git commit -m "Add Part 123 Student Module Consolidation"
git push
```

Render build and start commands remain unchanged.

Render → Manual Deploy → Clear build cache & deploy.

## Smoke tests
1. `/api/part123/status`
2. Login from `/login` as Student.
3. Open `/app`.
4. Open Student Workspace.
5. Confirm strict Student-linked mode.
6. Check linked/Not linked metrics.
7. Open Live Classes.
8. Open AI Class Notes when allowed.
9. Ask Student VANI for progress summary.
10. Try a denied or unknown module.
