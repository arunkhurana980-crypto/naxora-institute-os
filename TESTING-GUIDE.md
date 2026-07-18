# Part 131 Testing Guide

## Prerequisites

Create at least one Part 128 Branch and Student, plus an Owner or scoped Accountant login.

## Test flow

1. Create Fee Structure.
2. Assign it to Student.
3. Create Invoice.
4. Generate Due List.
5. Create in-app reminder.
6. Record partial manual offline Receipt.
7. Confirm Invoice becomes `partially_paid`.
8. Record remaining amount.
9. Confirm Invoice becomes `paid`.
10. Generate Student Statement.
11. Generate Finance Summary.
12. Request a Receipt correction.

## Negative tests

- Receipt larger than outstanding.
- Wrong Student ID.
- Wrong Branch scope.
- Student trying to create Invoice.
- Parent viewing another Student.
- Card/UPI/refund command.
- Wrong exact confirmation.
- Missing manual receipt acknowledgement.
