# Role Linking Required

For Teacher, Student and Parent runtime isolation, Owner must link the role login identity to a final master record.

Owner VANI fields:

```text
teacher.create → identityId + classIds
student.create → identityId + classIds
parent.create → identityId + childStudentIds
```

Without a linked record, role dashboard returns `ROLE_SCOPE_PENDING` instead of exposing institute-wide data.
