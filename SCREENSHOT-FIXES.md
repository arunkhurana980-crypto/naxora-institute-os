# Screenshot Diagnosis

## `refused to connect`

Root cause:

```text
backend/src/middleware/securityMiddleware.js
X-Frame-Options: DENY
```

Fixed policy:

```text
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: frame-ancestors 'self'
```

## Many VANI circles

The old coverage script inserted a button beside every link. It now shows one contextual `VANI Actions` button.

## Interpret command

Grey text is an example, not entered text. The page now explains this and accepts both `attendance mark` and `mark attendance` word order.
