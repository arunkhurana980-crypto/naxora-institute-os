import mongoose from "mongoose";

const childSchema = new mongoose.Schema(
  {
    studentName: { type: String, trim: true, required: true },
    rollNo: { type: String, trim: true, default: "" },
    courseName: { type: String, trim: true, default: "" },
    batchName: { type: String, trim: true, default: "" },
    classLevel: { type: String, trim: true, default: "" },
    attendancePercent: { type: Number, min: 0, max: 100, default: 0 },
    feeStatus: {
      type: String,
      enum: ["paid", "pending", "partial", "overdue", "not_set"],
      default: "not_set",
    },
    resultStatus: {
      type: String,
      enum: ["excellent", "good", "average", "needs_attention", "not_set"],
      default: "not_set",
    },
    lastScore: { type: Number, min: 0, default: 0 },
    nextAction: { type: String, trim: true, maxlength: 250, default: "" },
  },
  { _id: true }
);

const parentSchema = new mongoose.Schema(
  {
    parentName: {
      type: String,
      required: [true, "Parent name required hai"],
      trim: true,
      minlength: [2, "Parent name minimum 2 characters ka ho"],
      maxlength: [80, "Parent name maximum 80 characters ka ho"],
    },
    relation: {
      type: String,
      enum: ["father", "mother", "guardian", "brother", "sister", "other"],
      default: "guardian",
    },
    phone: { type: String, trim: true, maxlength: [20, "Phone number bahut long hai"], default: "" },
    alternatePhone: { type: String, trim: true, maxlength: [20, "Alternate phone bahut long hai"], default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    address: { type: String, trim: true, maxlength: [250, "Address bahut long hai"], default: "" },
    occupation: { type: String, trim: true, maxlength: [100, "Occupation bahut long hai"], default: "" },
    preferredContactMode: {
      type: String,
      enum: ["phone", "whatsapp", "email", "in_person", "not_set"],
      default: "phone",
    },
    portalAccess: {
      type: String,
      enum: ["enabled", "disabled", "pending"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "needs_followup"],
      default: "active",
    },
    children: { type: [childSchema], default: [] },
    lastMeetingDate: { type: Date, default: null },
    nextFollowUpDate: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: [900, "Notes bahut long hain"], default: "" },
    instituteName: { type: String, default: "NAXORA Institute" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

parentSchema.index({ createdBy: 1, parentName: 1 });
parentSchema.index({ createdBy: 1, phone: 1, status: 1 });
parentSchema.index({ createdBy: 1, portalAccess: 1, preferredContactMode: 1 });
parentSchema.index({ createdBy: 1, "children.studentName": 1 });

export default mongoose.model("Parent", parentSchema);
