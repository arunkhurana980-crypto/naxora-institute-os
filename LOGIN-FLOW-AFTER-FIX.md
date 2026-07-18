# Login Flow After Part 136.1

```text
/login
→ redirects to /common-login

/owner-bootstrap
→ only for first Owner creation

/common-login
→ Institute ID
→ Owner Email/Phone/Login ID
→ Password
→ /app
```

The generated Owner token contains:

```text
role = institute_owner
instituteId = generated Institute ID
authSource = part120
```

This gives `/vani-acceptance` a valid Owner and institute context.
