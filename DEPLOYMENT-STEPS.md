# Deployment Steps — Part 122

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART122.js
node .\VERIFY-PART122.js
git status
git add .
git commit -m "Add Part 122 Teacher Module Consolidation"
git push
```

Render build and start commands remain unchanged.

Render → Manual Deploy → Clear build cache & deploy.

## Smoke tests
1. `/api/part122/status`
2. Login from `/login` as Teacher.
3. Open `/app`.
4. Open Teacher Workspace.
5. Confirm strict Teacher mode.
6. Check linked/Not linked metrics.
7. Open Attendance.
8. Open Live Classes.
9. Try an unavailable paid module.
10. Ask Teacher VANI for summary and module navigation.
