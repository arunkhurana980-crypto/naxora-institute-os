import mongoose from "mongoose";

const paymentEventSchema = new mongoose.Schema(
  {
    eventType: { type: String, trim: true, default: "created" },
    message: { type: String, trim: true, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const paymentRecordSchema = new mongoose.Schema(
  {
    paymentFor: {
      type: String,
      enum: ["student_fees", "subscription", "admission", "certificate", "library", "other"],
      default: "student_fees",
      index: true,
    },
    payerName: {
      type: String,
      required: [true, "Payer name required hai"],
      trim: true,
      maxlength: 120,
    },
    payerPhone: { type: String, trim: true, maxlength: 20, default: "" },
    payerEmail: { type: String, trim: true, lowercase: true, maxlength: 140, default: "" },
    studentName: { type: String, trim: true, maxlength: 120, default: "" },
    instituteName: { type: String, trim: true, maxlength: 160, default: "" },
    relatedRecordId: { type: String, trim: true, default: "" },
    title: {
      type: String,
      required: [true, "Payment title required hai"],
      trim: true,
      maxlength: 160,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, "Amount 0 se zyada hona chahiye"],
      default: 0,
    },
    currency: { type: String, trim: true, uppercase: true, default: "INR" },
    provider: {
      type: String,
      enum: ["razorpay", "upi", "cash", "bank", "card", "manual", "other"],
      default: "manual",
      index: true,
    },
    paymentMode: {
      type: String,
      enum: ["online", "upi", "cash", "bank", "card", "other"],
      default: "online",
    },
    status: {
      type: String,
      enum: ["created", "pending", "paid", "failed", "refunded", "cancelled"],
      default: "created",
      index: true,
    },
    providerOrderId: { type: String, trim: true, default: "", index: true },
    providerPaymentId: { type: String, trim: true, default: "", index: true },
    providerSignature: { type: String, trim: true, default: "" },
    upiId: { type: String, trim: true, default: "" },
    transactionRef: { type: String, trim: true, default: "" },
    receiptNumber: { type: String, trim: true, default: "", index: true },
    receiptUrl: { type: String, trim: true, default: "" },
    receiptNote: { type: String, trim: true, maxlength: 700, default: "" },
    dueDate: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    events: { type: [paymentEventSchema], default: [] },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

paymentRecordSchema.index({ createdBy: 1, status: 1, paymentFor: 1, provider: 1, createdAt: -1 });
paymentRecordSchema.index({ payerName: "text", payerPhone: "text", payerEmail: "text", studentName: "text", title: "text", receiptNumber: "text", providerOrderId: "text", providerPaymentId: "text", transactionRef: "text" });

paymentRecordSchema.pre("save", function autoReceipt(next) {
  if (!this.receiptNumber) {
    const stamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    this.receiptNumber = `NX-PAY-${stamp}-${random}`;
  }
  next();
});

export default mongoose.model("PaymentRecord", paymentRecordSchema);
