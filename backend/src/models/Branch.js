import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    branchName: {
      type: String,
      required: [true, "Branch name required hai"],
      trim: true,
      minlength: [2, "Branch name minimum 2 characters ka ho"],
      maxlength: [140, "Branch name maximum 140 characters ka ho"],
    },
    branchCode: {
      type: String,
      required: [true, "Branch code required hai"],
      trim: true,
      uppercase: true,
      maxlength: [30, "Branch code maximum 30 characters ka ho"],
    },
    branchType: {
      type: String,
      enum: ["main", "franchise", "online", "partner", "temporary"],
      default: "main",
      index: true,
    },
    address: { type: String, trim: true, maxlength: 300, default: "" },
    city: { type: String, trim: true, maxlength: 100, default: "" },
    district: { type: String, trim: true, maxlength: 100, default: "" },
    state: { type: String, trim: true, maxlength: 100, default: "Haryana" },
    pinCode: { type: String, trim: true, maxlength: 20, default: "" },
    managerName: { type: String, trim: true, maxlength: 120, default: "" },
    managerPhone: { type: String, trim: true, maxlength: 25, default: "" },
    managerEmail: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },
    contactPhone: { type: String, trim: true, maxlength: 25, default: "" },
    contactEmail: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },
    openingDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["planning", "active", "inactive", "closed"],
      default: "active",
      index: true,
    },
    capacity: { type: Number, min: 0, max: 100000, default: 0 },
    currentStudents: { type: Number, min: 0, max: 100000, default: 0 },
    currentTeachers: { type: Number, min: 0, max: 10000, default: 0 },
    monthlyRevenue: { type: Number, min: 0, default: 0 },
    monthlyExpense: { type: Number, min: 0, default: 0 },
    facilities: [{ type: String, trim: true, maxlength: 80 }],
    notes: { type: String, trim: true, maxlength: 1500, default: "" },
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

branchSchema.index({ createdBy: 1, branchCode: 1 }, { unique: true });
branchSchema.index({ createdBy: 1, city: 1, status: 1 });
branchSchema.index({ branchName: "text", branchCode: "text", city: "text", managerName: "text" });

export default mongoose.model("Branch", branchSchema);
