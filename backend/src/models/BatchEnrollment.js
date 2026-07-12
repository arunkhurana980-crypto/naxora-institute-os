import mongoose from "mongoose";

const batchEnrollmentSchema = new mongoose.Schema(
  {
    onlineBatch: { type: mongoose.Schema.Types.ObjectId, ref: "OnlineBatchAccess", required: true, index: true },
    studentName: { type: String, required: [true, "Student name required hai"], trim: true, maxlength: 140, index: true },
    studentEmail: { type: String, trim: true, lowercase: true, maxlength: 180, index: true, default: "" },
    studentPhone: { type: String, required: [true, "Student phone required hai"], trim: true, maxlength: 20, index: true },
    parentPhone: { type: String, trim: true, maxlength: 20, default: "" },
    feeStatus: { type: String, enum: ["pending", "partial", "paid", "refunded", "expired"], default: "pending", index: true },
    paidAmount: { type: Number, min: 0, default: 0 },
    dueAmount: { type: Number, min: 0, default: 0 },
    accessStatus: { type: String, enum: ["pending", "active", "blocked", "expired", "completed"], default: "pending", index: true },
    joinedAt: { type: Date, default: Date.now },
    accessStartsAt: { type: Date, default: Date.now },
    accessExpiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), index: true },
    paymentReference: { type: String, trim: true, maxlength: 180, default: "" },
    source: { type: String, enum: ["manual", "discovery", "website", "whatsapp", "youtube", "instagram", "other"], default: "manual" },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

batchEnrollmentSchema.index({ createdBy: 1, onlineBatch: 1, accessStatus: 1 });
batchEnrollmentSchema.index({ studentPhone: 1, onlineBatch: 1 });

export default mongoose.model("BatchEnrollment", batchEnrollmentSchema);
