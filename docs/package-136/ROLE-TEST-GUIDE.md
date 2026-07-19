# Eight-Role Test Guide

Each role must log in using its own account and open `/vani-acceptance`.

## Owner

```json
{}
```

## Branch Manager

```json
{
  "branchId": "ASSIGNED_BRANCH_ID",
  "outsideBranchId": "OUTSIDE_BRANCH_ID"
}
```

## Teacher

```json
{
  "classId": "ASSIGNED_CLASS_ID",
  "outsideClassId": "OUTSIDE_CLASS_ID"
}
```

## Student

```json
{
  "studentId": "OWN_STUDENT_ID",
  "otherStudentId": "OTHER_STUDENT_ID"
}
```

## Parent

```json
{
  "linkedStudentId": "LINKED_CHILD_STUDENT_ID",
  "unlinkedStudentId": "UNLINKED_STUDENT_ID"
}
```

## Accountant

```json
{
  "branchId": "ASSIGNED_BRANCH_ID",
  "outsideBranchId": "OUTSIDE_BRANCH_ID"
}
```

## Counsellor

```json
{
  "assignedLeadId": "ASSIGNED_LEAD_ID",
  "unassignedLeadId": "UNASSIGNED_LEAD_ID"
}
```

## Staff

```json
{
  "branchId": "ASSIGNED_BRANCH_ID",
  "outsideBranchId": "OUTSIDE_BRANCH_ID"
}
```

Positive tests create a native preview and cancel it.

Outside-scope tests must be denied. An outside-scope preview that succeeds blocks final acceptance.
