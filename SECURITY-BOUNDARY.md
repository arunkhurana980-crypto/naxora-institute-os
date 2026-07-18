# Security Boundary

- HTTPS is required.
- Private bootstrap secret is required.
- Secret must be at least 24 characters.
- Secret is read from Render Environment.
- Secret is not stored in MongoDB.
- Secret is not returned by API.
- Password is not stored in preview.
- Password is scrypt-hashed.
- Exact confirmation is required.
- Preview expires after 20 minutes.
- Rate limiting is enabled.
- One global first-Owner lock prevents reuse.
- Additional institute self-provisioning is not included.
- No password, OTP or secret should be sent in chat.
