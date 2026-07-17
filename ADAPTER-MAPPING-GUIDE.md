# Adapter Mapping Guide

| Action | Native model |
|---|---|
| attendance.mark | Part126AttendanceRecord |
| attendance.correction_request | Part126AttendanceCorrectionRequest |
| fees.reminder | Part126FeeReminder |
| fees.assistance_request | Part126FeeAssistanceRequest |
| admission.follow_up | Part126AdmissionFollowUp |
| assignment.create | Part126Assignment |
| assignment.submit | Part126AssignmentSubmission |
| message.send | Part126RoleSafeMessage |
| branch.task.create | Part126BranchTask |

Shared integration models:
- Part126AdapterExecution
- Part126NotificationInbox
- Part126DeliveryAttempt
- Part126IntegrationAudit
