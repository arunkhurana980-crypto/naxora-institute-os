import mongoose from "mongoose";

const feeSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: [true, "Student name required hai"],
      trim: true,
      maxlength: 80,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    courseName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    batchName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    month: {
      type: String,
      required: [true, "Fees month required hai"],
      trim: true,
      maxlength: 30,
    },
    dueDate: {
      type: Date,
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount required hai"],
      min: 0,
      default: 0,
    },
    paidAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    discount: {
      type: Number,
      min: 0,
      default: 0,
    },
    pendingAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ["paid", "pending", "partial", "overdue"],
      default: "pending",
    },
    paymentMode: {
      type: String,
      enum: ["cash", "upi", "bank", "card", "other"],
      default: "cash",
    },
    paymentDate: {
      type: Date,
    },
    receiptNo: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    instituteName: {
      type: String,
      trim: true,
      default: "NAXORA Institute",
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

feeSchema.index({ studentName: "text", phone: "text", courseName: "text", batchName: "text", month: "text", receiptNo: "text" });

export default mongoose.model("Fee", feeSchema);
