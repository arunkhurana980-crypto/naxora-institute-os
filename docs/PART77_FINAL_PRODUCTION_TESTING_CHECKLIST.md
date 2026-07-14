# Part 77 Final Production Testing Checklist

## Mobile
- [ ] Landing page mobile open
- [ ] Login/signup mobile usable
- [ ] Dashboard mobile readable
- [ ] Student/parent portal mobile readable
- [ ] AI Hub/VANI pages mobile usable

## Laptop
- [ ] Dashboard layout
- [ ] Sidebar links
- [ ] Forms and tables
- [ ] Public profile/discovery flow
- [ ] AI pages

## Roles
- [ ] Owner access
- [ ] Branch manager access
- [ ] Accountant access
- [ ] Teacher access
- [ ] Receptionist/counsellor access
- [ ] Student own data only
- [ ] Parent linked child only
- [ ] Super admin logged support only

## APIs
- [ ] /api/health
- [ ] Part 53–77 status APIs
- [ ] Student/fees/enquiry APIs
- [ ] AI Hub/VANI APIs
- [ ] Safe error handling

## Database
- [ ] MongoDB connected mode
- [ ] Student save-refresh
- [ ] Fees save-refresh
- [ ] Enquiry save-refresh
- [ ] Audit log safe write

## Payments
- [ ] Plans
- [ ] Order create safe/mock
- [ ] Payment record
- [ ] Invoice preview
- [ ] Failed payment handling

## AI limits
- [ ] AI credits summary
- [ ] Usage logs
- [ ] VANI private-screen-first
- [ ] No AI API key exposed

## Security
- [ ] No .env committed
- [ ] Internal pages hidden
- [ ] Protected routes checked
- [ ] Sensitive actions owner verification
- [ ] 3.0 owner-only rule preserved

## Backup/performance
- [ ] GitHub source pushed
- [ ] MongoDB backup/export plan
- [ ] Render cold start understood
- [ ] Health endpoint working

## Final decision
- [ ] All critical tests passed
- [ ] Warnings recorded
- [ ] Part 78 launch allowed by owner
