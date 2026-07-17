# NAXORA Part 112/113 Route Order Hotfix

## Root cause
Part 112 and Part 113 route registration blocks were inserted near `const port`, but the existing Express `notFound`/404 middleware is registered earlier. Express executes middleware in order, so requests reached the 404 handler before the new routes.

## Fix
This installer:
1. Checks current `server.js` syntax.
2. Removes only the known Part 112 and Part 113 registration blocks.
3. Re-inserts both blocks immediately before `app.use(notFound);` or the custom `ROUTE_NOT_FOUND` middleware.
4. Runs syntax and route-order verification.
5. Automatically restores the original `server.js` if anything fails.

## Install
Extract ZIP and copy both `.js` files into the project root, beside `backend` and `frontend`.

Run one command at a time:

```powershell
node .\FIX-PART112-113-ROUTE-ORDER.js
node .\VERIFY-PART112-113-ROUTES.js
git status
git add .
git commit -m "Fix Part 112 and 113 route registration order"
git push
```

Then Render:

```text
Manual Deploy → Clear build cache & deploy
```

## Tests after deploy
- `/api/part112/status`
- `/razorpay-test-mode-foundation`
- `/api/part113/status`
- `/api/part113/templates`
- `/subscription-plans`

The status routes must return Part 112/113 JSON instead of `ROUTE_NOT_FOUND`.
