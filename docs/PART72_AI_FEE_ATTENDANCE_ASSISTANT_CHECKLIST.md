# Part 72 Testing Checklist

- [ ] /api/part72/status success true
- [ ] /ai-fee-attendance-assistant page loads
- [ ] /api/part72/fee-summary?role=owner returns rows
- [ ] /api/part72/frequently-absent?role=owner returns rows
- [ ] /api/part72/support-alerts?role=owner returns alerts
- [ ] /api/part72/demo returns fee summary, absent list, reminder draft and VANI preview
- [ ] Student role cannot access full fee summary
- [ ] Teacher role has attendance-only safe behavior
- [ ] Sensitive commands are blocked without owner verification
- [ ] /api/part72/activity shows audit logs
- [ ] /api/part71/status still works
- [ ] /ai-admission-copilot still opens
