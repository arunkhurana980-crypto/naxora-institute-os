# Part 129 Testing Guide

## Test 1 — CSV Branch import

1. Open `/app` as Owner.
2. Ask VANI: `CSV import kholo`.
3. Select `branches.csv`.
4. Choose Branches.
5. Auto-map columns.
6. Create preview.
7. Confirm with exact confirmation and Owner Secret.

## Test 2 — Linked package

1. Select `linked-package.json`.
2. The UI should automatically switch to Linked JSON Package.
3. Preview must show seven linked record groups.
4. Enter one private temporary password for all account rows.
5. Confirm.
6. Teacher, Student, Parent and Staff accounts must require password change.

## Negative tests

- Duplicate branchCode with duplicate policy `error`.
- Duplicate identifier with duplicate policy `skip`.
- Missing Student branch reference.
- Invalid Staff role.
- Wrong exact confirmation.
- Wrong Owner Secret.
- More than 500 rows.
- More than 100 account rows.
