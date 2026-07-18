# Render Environment Setup

Before opening `/owner-bootstrap`, configure privately in Render:

```text
NAXORA_OWNER_BOOTSTRAP_SECRET
```

Rules:

- Minimum 24 characters.
- Do not send it in chat.
- Do not put it in GitHub.
- Do not show it in screenshots.
- Keep the existing `JWT_SECRET` configured.
- After first Owner creation, rotate or remove the bootstrap secret.

Then redeploy:

```text
Render Dashboard
→ Environment
→ Save Changes
→ Manual Deploy
→ Clear build cache & deploy
```
