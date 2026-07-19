# Troubleshooting

## `/app` still shows the old login page

- Confirm latest Render deployment is Live.
- Open `/api/part1365/status`.
- Use a private browser window.
- Press `Ctrl + F5`.
- Confirm status says `oldPublicLoginAtAppBlocked: true`.

## Unified shell opens but says not connected

- Log out of old Student/public sessions.
- Sign in again through `/owner-login`.
- Do not enter Institute ID on the Owner login screen.
- The Part 136.5 bridge copies the Owner token and Institute ID into the Part 119 session keys.

## Invalid Owner credentials

Create the Owner through `/create-institute`, or use the same Owner Login ID and password used during account creation.
