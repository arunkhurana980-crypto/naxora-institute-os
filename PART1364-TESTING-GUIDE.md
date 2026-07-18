# Runtime Testing

## New institute

1. Open `/create-institute`.
2. Create an institute.
3. Confirm an Institute ID appears.
4. Open `/app`.
5. Confirm role is `institute_owner`.
6. Log out.
7. Open `/owner-login`.
8. Login with only Owner Login ID and password.

## Other roles

Teacher, Student, Parent and Staff continue using `/common-login` with:

```text
Institute ID
Login ID
Password
```

## Duplicate Owner Login ID

Creating another institute with the same Owner Login ID must return:

```text
OWNER_IDENTIFIER_ALREADY_REGISTERED
```
