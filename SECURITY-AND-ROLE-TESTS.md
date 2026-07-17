# Security and Role Tests — Part 120

## Mandatory
- Part 120 registers before Parts 112–119.
- No JWT on private session endpoint returns 401.
- Wrong password gets a generic credential error.
- Login ID enumeration is not exposed.
- Five failed account attempts produce temporary lock.
- Login rate limiter produces 429 after repeated attempts.
- Disabled account cannot login.
- Old token fails after tokenVersion increment.
- Teacher/student/parent cannot access account manager.
- Owner cannot manage another institute.
- Account creation requires exact confirmation and Owner Action Secret.
- Password reset requires exact confirmation and Owner Action Secret.
- Temporary password requires first-login change.
- Password and hash never appear in API output.
- `/app` redirects to common login without a valid session.
