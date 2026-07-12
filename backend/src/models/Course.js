import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Course name required hai"],
      trim: true,
      minlength: [2, "Course name minimum 2 characters ka ho"],
      maxlength: [120, "Course name bahut long hai"],
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [30, "Course code bahut long hai"],
      default: "",
    },
    category: {
      type: String,
      trim: true,
      maxlength: [80, "Category bahut long hai"],
      default: "",
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "not_set"],
      default: "beginner",
    },
    duration: {
      type: String,
      trim: true,
      maxlength: [60, "Duration bahut long hai"],
      default: "",
    },
    mode: {
      type: String,
      enum: ["offline", "online", "hybrid", "not_set"],
      default: "offline",
    },
    totalFees: {
      type: Number,
      min: [0, "Fees negative nahi ho sakti"],
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "upcoming"],
      default: "active",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [700, "Description bahut long hai"],
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

courseSchema.index({ createdBy: 1, name: 1 });
courseSchema.index({ createdBy: 1, status: 1, mode: 1 });

export default mongoose.model("Course", courseSchema);
