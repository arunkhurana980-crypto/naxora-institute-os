import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Teacher name required hai"],
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
    subject: {
      type: String,
      trim: true,
      maxlength: [100, "Subject name bahut long hai"],
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
    qualification: {
      type: String,
      trim: true,
      maxlength: [120, "Qualification bahut long hai"],
      default: "",
    },
    experienceYears: {
      type: Number,
      min: [0, "Experience negative nahi ho sakta"],
      max: [60, "Experience bahut zyada hai"],
      default: 0,
    },
    salaryType: {
      type: String,
      enum: ["monthly", "per_class", "percentage", "not_set"],
      default: "not_set",
    },
    salaryAmount: {
      type: Number,
      min: [0, "Salary negative nahi ho sakti"],
      default: 0,
    },
    salaryStatus: {
      type: String,
      enum: ["paid", "pending", "partial", "not_set"],
      default: "not_set",
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    address: {
      type: String,
      trim: true,
      maxlength: [250, "Address bahut long hai"],
      default: "",
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

teacherSchema.index({ createdBy: 1, name: 1 });
teacherSchema.index({ createdBy: 1, subject: 1, batchName: 1 });
teacherSchema.index({ createdBy: 1, status: 1, salaryStatus: 1 });

export default mongoose.model("Teacher", teacherSchema);
