# Rollback

```powershell
node .\ROLLBACK-PART1361.js
node --check .\backend\src\server.js
```

Rollback removes:

- Early `/login` redirect.
- Part 136.1 route/API registration.
- Common Login bootstrap-link bridge.

Rollback does not delete:

- Created Owner identity.
- Generated Institute ID.
- Bootstrap lock.
- Bootstrap audit records.
