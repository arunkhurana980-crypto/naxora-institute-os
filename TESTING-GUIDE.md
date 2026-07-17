# Part 120 Testing Guide

## First owner migration
1. Login from the existing owner login.
2. Open `/login`.
3. Expand “existing session” migration.
4. Use institute ID, owner Login ID, display name and new common password.
5. Submit.
6. Confirm `/app` opens.

## Common login
1. Logout.
2. Open `/login`.
3. Enter the same institute ID, Login ID and password.
4. Confirm role-safe `/app`.

## Create Teacher
1. Owner opens `/account-access-manager`.
2. Fill Teacher details and temporary password.
3. Preview.
4. Enter exact confirmation and private owner verification.
5. Create.
6. Login as Teacher.
7. Change temporary password.
8. Confirm Owner/Billing modules are hidden.

## Negative tests
- Wrong institute ID.
- Wrong password.
- Repeated login failures.
- Disabled account.
- Wrong confirmation.
- Wrong owner secret.
- Student token on Account Access Manager.
- Expired/revoked token.
