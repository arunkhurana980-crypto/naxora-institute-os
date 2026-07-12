import mongoose from "mongoose";

const onlineBatchAccessSchema = new mongoose.Schema(
  {
    batchName: { type: String, required: [true, "Batch name required hai"], trim: true, maxlength: 140, index: true },
    courseName: { type: String, required: [true, "Course name required hai"], trim: true, maxlength: 140, index: true },
    subject: { type: String, trim: true, maxlength: 100, default: "" },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    teacherName: { type: String, trim: true, maxlength: 120, default: "" },
    mode: { type: String, enum: ["online", "hybrid", "offline_plus_online"], default: "online", index: true },
    feeAmount: { type: Number, min: 0, default: 999 },
    billingCycle: { type: String, enum: ["one_time", "monthly", "quarterly", "yearly"], default: "monthly" },
    currency: { type: String, trim: true, maxlength: 10, default: "INR" },
    accessDurationDays: { type: Number, min: 1, max: 3650, default: 30 },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    maxStudents: { type: Number, min: 1, max: 50000, default: 100 },
    enrolledStudents: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ["draft", "open", "full", "closed", "archived"], default: "open", index: true },
    liveClassAccess: { type: Boolean, default: true },
    commentsAccess: { type: Boolean, default: true },
    recordingAccess: { type: Boolean, default: true },
    notesAccess: { type: Boolean, default: true },
    certificateAccess: { type: Boolean, default: false },
    paymentRequired: { type: Boolean, default: true },
    paymentMode: { type: String, enum: ["cash", "upi", "bank", "razorpay", "card", "other"], default: "razorpay" },
    publicVisible: { type: Boolean, default: true, index: true },
    tags: [{ type: String, trim: true, maxlength: 60 }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

onlineBatchAccessSchema.index({ createdBy: 1, status: 1, batchName: 1 });
onlineBatchAccessSchema.index({ batchName: "text", courseName: "text", subject: "text", description: "text", teacherName: "text" });

export default mongoose.model("OnlineBatchAccess", onlineBatchAccessSchema);
