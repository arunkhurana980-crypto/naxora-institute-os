# Part 119 Testing Guide

## Public tests
- `/api/part119/status`
- `/api/part119/catalog`
- `/app`

## Existing-session test
1. Login through an existing owner/teacher/student/parent route.
2. Open `/app`.
3. Press Connect Existing Login if auto-detection does not run.
4. Confirm role badge and module list.

## Owner tests
- Billing controls visible.
- Business modules depend on Part 116 entitlement.
- V3 modules depend on active V3 subscription.

## Teacher tests
- Teacher app, attendance, reports, live classes and allowed AI modules.
- Owner billing and owner AI hidden/blocked.

## Student tests
- Student app, live classes and allowed student AI modules.
- Fees management and owner controls blocked.

## Parent tests
- Parent app only from current catalogue.
- Owner/teacher/business controls blocked.

## VANI tests
- Allowed module opens.
- Denied module stays closed.
- Unknown module gets safe reply.
- Sensitive credential request is blocked.

## Route tests
- Hash changes to `#/module/<key>`.
- Refresh preserves selected module.
- Back button returns to previous shell state.
