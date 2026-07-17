# Security and Role Tests — Part 124

## Route and role
- Part 120 → 121 → 122 → 123 → 124 → Parts 112–119 order passes.
- No JWT returns 401.
- Parent cannot request Branch workspace.
- Branch Manager cannot request Accountant workspace.
- instituteId mismatch returns 403.
- Owner can use Supervisor Mode.

## Parent
- No assigned child IDs means Scope Pending.
- Parent A cannot see Parent B’s child records.
- Direct Parent ID model fields may match only the logged-in Parent identity.
- Student-linked models use only Owner-assigned child IDs.

## Branch
- No Branch ID means Scope Pending.
- Branch A role cannot see Branch B records.
- Models without branch fields are not counted in branch mode.

## Institute-wide roles
- Accountant/Counsellor/Staff require explicit Owner grant or Branch IDs.
- Client cannot self-enable institute-wide access.

## Scope changes
- Owner only.
- Exact confirmation required.
- Owner Action Secret required.
- Account role and institute are checked server-side.

## Modules
- Unknown module returns 404.
- Plan-blocked module remains blocked.
- Arbitrary URL is not accepted.
- Sensitive VANI requests are blocked.
