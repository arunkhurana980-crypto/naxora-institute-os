import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Student name required hai"],
      trim: true,
      minlength: [2, "Name minimum 2 characters ka ho"],
      maxlength: [70, "Name maximum 70 characters ka ho"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, "Phone number bahut long hai"],
      default: "",
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "not_set"],
      default: "not_set",
    },
    classLevel: {
      type: String,
      trim: true,
      maxlength: [50, "Class/level bahut long hai"],
      default: "",
    },
    courseName: {
      type: String,
      trim: true,
      maxlength: [100, "Course name bahut long hai"],
      default: "",
    },
    batchName: {
      type: String,
      trim: true,
      maxlength: [100, "Batch name bahut long hai"],
      default: "",
    },
    guardianName: {
      type: String,
      trim: true,
      maxlength: [70, "Guardian name bahut long hai"],
      default: "",
    },
    guardianPhone: {
      type: String,
      trim: true,
      maxlength: [20, "Guardian phone bahut long hai"],
      default: "",
    },
    address: {
      type: String,
      trim: true,
      maxlength: [250, "Address bahut long hai"],
      default: "",
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    feesStatus: {
      type: String,
      enum: ["paid", "pending", "partial"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes bahut long hain"],
      default: "",
    },
    instituteName: {
      type: String,
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

studentSchema.index({ createdBy: 1, name: 1 });
studentSchema.index({ createdBy: 1, courseName: 1, batchName: 1 });

export default mongoose.model("Student", studentSchema);
