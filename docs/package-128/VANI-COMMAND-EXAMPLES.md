# Part 128 VANI Commands

```text
branch create branchName="North Branch" branchCode=NORTH city=Delhi
course create courseName="JEE Foundation" courseCode=JEEF durationMonths=12 feeAmount=25000
batch create branchId=BRANCH_ID courseId=COURSE_ID batchCode=JEE-A title="JEE Morning Batch"
teacher create identifier=teacher01 displayName="Aman Sir" branchIds=BRANCH_ID subjects=Maths,Physics
student create identifier=student01 displayName="Riya" branchId=BRANCH_ID classId=CLASS_ID
parent create link identifier=parent01 displayName="Riya Parent" studentId=STUDENT_ID relationship=mother
accountant create identifier=accounts01 displayName="Demo Accountant" accountRole=accountant instituteWide=true
staff update scope staffIdentityId=STAFF_ID accountRole=staff branchIds=BRANCH_ID
```

Password aur Owner Secret command me mat likhna.
