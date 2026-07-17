# Part 125 Native Action Adapter Contract

Part 126 registers adapters in code:

```js
registerPart125ActionAdapter(
  app,
  "attendance.mark",
  async ({ actionId, instituteId, actor, payload, canonicalRecordId }) => {
    // Validate native class/Student relationships.
    // Perform the native module write.
    return {
      success: true,
      nativeRecordId: "record-id",
      externalDeliveryPerformed: false,
    };
  },
  "Part126 Attendance Adapter"
);
```

## Requirements
- Adapter must revalidate native module relationships.
- Adapter must be idempotent by `actionId`.
- Adapter must never trust arbitrary model or URL names from the client.
- Adapter must return only safe metadata.
- Provider delivery must report `externalDeliveryPerformed` accurately.
- Adapter failure must throw an error with safe `code` and `message`.

Part 125 preserves the canonical action even if an adapter fails.
