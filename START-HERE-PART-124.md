# START HERE — Part 124

## Exact name
**Part 124 — Parent, Staff and Branch Role Consolidation**

## Workspaces

```text
/parent-workspace
/branch-workspace
/accountant-workspace
/counsellor-workspace
/staff-workspace
```

Owner-only scope setup:

```text
/role-scope-manager
```

## Why Role Scope Manager is required
A login role alone is not enough to safely decide:
- which children a Parent may see,
- which branch a Branch Manager may see,
- whether an Accountant, Counsellor or Staff account is branch-only or institute-wide.

Part 124 stores explicit Owner-approved scope assignments.

## Rules
- Parent: at least one child Student ID.
- Branch Manager: at least one Branch ID.
- Accountant/Counsellor/Staff: Branch IDs or explicit institute-wide grant.
- Owner Action Secret and exact confirmation are required.

## Install

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART124.js
node .\VERIFY-PART124.js
```

## Git

```powershell
git status
git add .
git commit -m "Add Part 124 Parent Staff and Branch Role Consolidation"
git push
```
