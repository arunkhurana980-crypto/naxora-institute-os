# Part 131 Security and Role Tests

## Owner
- Institute-wide finance operations.
- Institute-wide reports.

## Accountant
- Requires active Part 124 scope.
- Institute-wide only when Owner assigned `instituteWide=true`.
- Otherwise restricted to assigned Branch IDs.

## Branch Manager
- Restricted to assigned Branch IDs.

## Student
- Can generate only their own fee statement.
- Cannot create or change financial records.

## Parent
- Can generate only an Owner-linked child fee statement.
- Cannot create or change financial records.

## Safety
- Cross-institute references blocked.
- Duplicate actions blocked.
- Receipt amount cannot exceed Invoice outstanding.
- Invoice amount cannot become lower than recorded receipts.
- Paid Invoice reminder blocked.
- Manual receipt acknowledgement required.
- Receipt remains unverified.
- No refund, settlement, card or UPI execution.
