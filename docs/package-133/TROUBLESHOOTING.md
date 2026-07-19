# Part 133 Troubleshooting

- `NATIVE_MODELS_MISSING`: Parts 120/124/128 must be registered.
- `PART132_MODEL_MISSING`: Apply Part 132 before CRM Lead communication.
- `BRANCH_SCOPE_MISMATCH`: Owner must assign correct Part 124 scope.
- `TEACHER_CLASS_SCOPE_MISMATCH`: Teacher can target only assigned Class.
- `COUNSELLOR_LEAD_SCOPE_MISMATCH`: Counsellor can target only assigned Leads.
- `NO_RECIPIENTS`: Target has no active recipients.
- `skipped_no_consent`: Recipient has not enabled external consent or Lead consent is absent.
- `skipped_provider_unconfigured`: Provider endpoint is missing or unsafe.
- Scheduled message did not run: in-process scheduler works only while the web service remains active.
