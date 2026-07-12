# NAXORA Part 51 - Public / Private Route Policy

Final deployment me internal demo/debug/testing pages public users ko nahi dikhne chahiye.

## Public URLs

- `/` - Landing page
- `/login` - Login page
- `/signup` - Signup page
- `/dashboard` - Dashboard after login
- `/student` - Student portal
- `/parent` - Parent portal
- `/admin` - Super Admin route

## Private/Internal Pages

- `/app/launch-package.html`
- `/app/final-testing.html`
- `/app/system-debug.html`
- `/app/client-pitch.html`
- `/app/demo-mode.html`
- `/app/deployment.html`
- `/app/razorpay-final.html`

## Production Environment

Use these settings before public deployment:

```env
NODE_ENV=production
INTERNAL_TOOLS_ENABLED=false
DEMO_MODE_ENABLED=false
INTERNAL_ADMIN_KEY=use_a_long_private_key_only_if_needed
```

## Testing

Open:

- `/api/public-route-policy/status`
- `/api/part51/status`
- `/app/secure-routes.html`

