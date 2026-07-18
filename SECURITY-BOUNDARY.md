# Security Boundary

Included:

- HTTPS required for signup.
- Scrypt password hashing.
- Generic invalid login response.
- Signup and login rate limits.
- Owner account lockout.
- Globally unique Owner Login ID for simple login.
- Password and password hash never returned.

Not included:

- Email or phone OTP verification.
- CAPTCHA.
- Automatic subscription payment.

Before a large public launch, add email/phone verification and bot protection.
