# Troubleshooting

## `BOOTSTRAP_SECRET_NOT_CONFIGURED`

Add `NAXORA_OWNER_BOOTSTRAP_SECRET` in Render Environment and redeploy.

## `BOOTSTRAP_SECRET_TOO_SHORT`

Use at least 24 characters.

## `BOOTSTRAP_VERIFICATION_FAILED`

The browser value does not match the Render Environment value.

## `OWNER_ALREADY_EXISTS`

Bootstrap has already been completed. Use `/common-login`.

## `BOOTSTRAP_ALREADY_LOCKED`

The one-time bootstrap lock already exists. Do not try to create another first Owner.

## `PART120_IDENTITY_MODEL_UNAVAILABLE`

Part 120 is not registered before Part 136.1.

## `/login` still opens old page

Clear browser cache and confirm the new Render deployment is Live. Test `/login` in a private window.

## Owner created but `/vani-acceptance` says Student

Log out/remove the old Student session, then login through `/common-login` with the new Owner Institute ID and Owner login ID.
