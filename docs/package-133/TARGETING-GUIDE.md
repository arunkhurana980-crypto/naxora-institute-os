# Part 133 Targeting Guide

- `identity`: Owner-only direct Part 120 identities.
- `role`: Owner-only institute-wide role target.
- `branch_role`: requires `branchId` and `targetRole`.
- `class_role`: requires `classId`; supports Student, Parent or Teacher.
- `student_parent`: requires `studentIds`; optional `targetRole=student|parent|both`.
- `crm_lead`: requires Part 132 `leadIds`; Counsellor can target only assigned Leads.

External CRM Lead delivery requires `consentToContact=true` and `doNotContact=false`.
