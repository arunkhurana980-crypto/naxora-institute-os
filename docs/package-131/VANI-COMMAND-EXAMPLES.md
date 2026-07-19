# Part 131 VANI Command Examples

```text
fee structure create title="JEE Monthly Fee" billingCycle=monthly amount=3500 branchId=BRANCH_ID dueDay=10
```

```text
student fee assign studentId=STUDENT_ID structureId=STRUCTURE_ID startDate=2026-08-01 discountAmount=500
```

```text
invoice create studentId=STUDENT_ID amount=3000 dueDate=2026-08-10 description="August tuition fee"
```

```text
receipt record invoiceId=INVOICE_ID amount=1500 paymentMethod=cash reference=OFFLINE-RCT-101 note="Counter receipt"
```

```text
receipt correction request receiptId=RECEIPT_ID reason="Wrong reference entered"
```

```text
due list generate branchId=BRANCH_ID asOfDate=2026-08-15 minimumDue=1
```

```text
fee reminder create invoiceId=INVOICE_ID message="Please review the pending fee in your private NAXORA account."
```

```text
student fee statement generate studentId=STUDENT_ID
```

```text
finance summary generate branchId=BRANCH_ID fromDate=2026-08-01 toDate=2026-08-31
```

Never put password, OTP, UPI PIN, card number, banking secret or Razorpay secret in a VANI command.
