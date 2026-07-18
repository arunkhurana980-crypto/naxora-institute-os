# Security

The secret is accepted through the original header plus a same-origin HTTPS body fallback. It is deleted from `req.body` immediately after reading and is never returned. After Owner creation, remove the bootstrap environment variable and redeploy.
