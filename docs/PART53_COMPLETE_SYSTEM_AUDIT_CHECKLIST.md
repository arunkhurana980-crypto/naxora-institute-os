# Part 53 Manual Audit Checklist

## 1. Route audit

- `/`
- `/login`
- `/signup`
- `/dashboard`
- `/student`
- `/parent`
- `/teachers`
- `/progress`
- `/fees`
- `/attendance`
- `/enquiries`
- `/followups`
- `/payments`
- `/live-classes`
- `/system-audit`

Old `.html` links should redirect to clean routes.

## 2. CRUD audit

For every important module:

- Add sample data
- Confirm list reloads
- Refresh page
- Confirm data still exists
- Try edit
- Try delete
- Try search/filter
- Check browser console errors

## 3. MongoDB audit

- `/api/health` must show `dbMode: mongodb`
- `/api/part53/run` must show MongoDB collection checks
- Empty collection warning is okay until demo data is added

## 4. Protected route audit

Direct API without login may show:

```txt
Login token missing hai
```

This is normal for protected modules.

## 5. Demo/client readiness

Do not show a client until:

- Signup/Login works
- Student save works
- Fee save works
- Attendance save works
- At least 5 demo students exist
- No 404 in sidebar buttons
- Razorpay is in test/mock mode only unless KYC/live keys are ready
