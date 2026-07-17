# Part 120 Honest Boundary

Part 120 creates a real independent common-login identity layer.

It does not automatically know old plaintext passwords. Secure systems do not expose them. Existing users migrate once using a valid existing JWT and set a fresh common password.

It does not yet merge every role module UI. That begins in Part 121.

It does not send password-reset email/SMS. Owner-controlled reset with exact confirmation is provided; notification providers are consolidated in Part 126.

It does not allow public self-signup. Owner provisioning prevents unauthorized institute access.
