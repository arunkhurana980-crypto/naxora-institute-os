# Part 136.1 APIs

## Public status

- `GET /api/part1361/status`
- `GET /api/part1361/security-policy`

## Secret-protected one-time bootstrap

- `POST /api/part1361/bootstrap/preview`
- `POST /api/part1361/bootstrap/confirm`

Header:

```text
x-naxora-bootstrap-secret
```

The real secret belongs only in the browser form and Render Environment. Do not place it in docs, GitHub or chat.
