# Part 55 Security and Role Permissions Checklist

## Backend

- [ ] `/api/part55/status` success true
- [ ] `/api/part55/roles` seven roles return kare
- [ ] `/api/part55/permission-catalog` permissions return kare
- [ ] `/api/part55/matrix` role-permission matrix return kare
- [ ] `/api/part55/protected-areas` route/API mapping return kare
- [ ] `/api/part55/check-access?role=teacher&permission=attendance.write` allowed true aaye
- [ ] `/api/part55/check-access?role=student&permission=fees.write` allowed false aaye

## Frontend

- [ ] `/role-permissions` page open
- [ ] roles cards visible
- [ ] access checker works
- [ ] permission matrix visible
- [ ] protected areas visible
- [ ] mobile view usable

## Manual Security Rules

- [ ] NAXORA Super Admin: platform access only founder/admin ke liye
- [ ] Institute Owner: apne institute ka full control
- [ ] Sub-Admin: operations allowed, final security/billing limited
- [ ] Teacher: assigned batches/students only
- [ ] Staff: enquiry/fees/attendance desk work only
- [ ] Student: self data only
- [ ] Parent: linked child data only

## Do not push

- [ ] `.env`
- [ ] MongoDB URI
- [ ] JWT secret
- [ ] Razorpay secret
- [ ] `node_modules`
