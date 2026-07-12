import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Staff name required hai"],
      trim: true,
      minlength: [2, "Name minimum 2 characters ka ho"],
      maxlength: [80, "Name maximum 80 characters ka ho"],
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
    staffRole: {
      type: String,
      enum: [
        "receptionist",
        "accountant",
        "counsellor",
        "office_admin",
        "support_staff",
        "marketing",
        "cleaning",
        "security",
        "other",
      ],
      default: "other",
    },
    department: {
      type: String,
      trim: true,
      maxlength: [100, "Department bahut long hai"],
      default: "",
    },
    shift: {
      type: String,
      enum: ["morning", "afternoon", "evening", "full_day", "flexible", "not_set"],
      default: "not_set",
    },
    joiningDate: {
      type: Date,
      default: Date.now,
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
    attendanceStatus: {
      type: String,
      enum: ["present", "absent", "late", "leave", "not_marked"],
      default: "not_marked",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "on_leave"],
      default: "active",
    },
    emergencyContact: {
      type: String,
      trim: true,
      maxlength: [20, "Emergency contact bahut long hai"],
      default: "",
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
      maxlength: [700, "Notes bahut long hain"],
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

staffSchema.index({ createdBy: 1, name: 1 });
staffSchema.index({ createdBy: 1, staffRole: 1, department: 1 });
staffSchema.index({ createdBy: 1, status: 1, salaryStatus: 1, attendanceStatus: 1 });

export default mongoose.model("Staff", staffSchema);
