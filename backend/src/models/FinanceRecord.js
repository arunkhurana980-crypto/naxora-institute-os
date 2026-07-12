import mongoose from "mongoose";

const financeRecordSchema = new mongoose.Schema(
  {
    recordType: {
      type: String,
      enum: ["income", "expense"],
      required: true,
      default: "income",
    },
    title: {
      type: String,
      required: [true, "Record title required hai"],
      trim: true,
      maxlength: 120,
    },
    category: {
      type: String,
      enum: [
        "fees",
        "admission",
        "salary",
        "rent",
        "electricity",
        "internet",
        "marketing",
        "software",
        "stationery",
        "equipment",
        "maintenance",
        "refund",
        "other",
      ],
      default: "other",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    paymentMode: {
      type: String,
      enum: ["cash", "upi", "bank", "card", "other"],
      default: "cash",
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    month: {
      type: String,
      trim: true,
      default: "",
    },
    paidToOrFrom: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    referenceNo: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    status: {
      type: String,
      enum: ["completed", "pending", "cancelled"],
      default: "completed",
    },
    recurring: {
      type: Boolean,
      default: false,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 600,
      default: "",
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

financeRecordSchema.index({ createdBy: 1, recordType: 1, category: 1, status: 1, transactionDate: -1 });
financeRecordSchema.index({ title: "text", paidToOrFrom: "text", referenceNo: "text", month: "text", note: "text" });

export default mongoose.model("FinanceRecord", financeRecordSchema);
