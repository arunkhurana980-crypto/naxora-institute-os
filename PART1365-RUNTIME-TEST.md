# Runtime Test

1. Open `/owner-login`.
2. Sign in with Owner Login ID and password.
3. Confirm the browser opens `/app`.
4. The page must show:
   - NAXORA sidebar.
   - Owner role badge.
   - Owner Workspace.
   - Global VANI button.
5. The old public page containing `Login / Create account` must not appear.
6. Open `/app/` manually and confirm the same unified shell appears.
7. Open `/api/part1365/status`.

Expected:

```json
{
  "appServesUnifiedShellEarly": true,
  "oldPublicLoginAtAppBlocked": true,
  "ownerSessionBridgeActive": true
}
```
