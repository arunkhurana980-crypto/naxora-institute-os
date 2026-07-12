import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Batch name required hai"],
      trim: true,
      minlength: [2, "Batch name minimum 2 characters ka ho"],
      maxlength: [120, "Batch name bahut long hai"],
    },
    courseName: {
      type: String,
      trim: true,
      maxlength: [120, "Course name bahut long hai"],
      default: "",
    },
    teacherName: {
      type: String,
      trim: true,
      maxlength: [100, "Teacher name bahut long hai"],
      default: "",
    },
    timing: {
      type: String,
      trim: true,
      maxlength: [80, "Timing bahut long hai"],
      default: "",
    },
    days: {
      type: String,
      trim: true,
      maxlength: [120, "Days bahut long hai"],
      default: "",
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    maxStudents: {
      type: Number,
      min: [0, "Max students negative nahi ho sakte"],
      default: 0,
    },
    enrolledStudents: {
      type: Number,
      min: [0, "Enrolled students negative nahi ho sakte"],
      default: 0,
    },
    batchFees: {
      type: Number,
      min: [0, "Batch fees negative nahi ho sakti"],
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "upcoming", "completed"],
      default: "active",
    },
    location: {
      type: String,
      trim: true,
      maxlength: [180, "Location bahut long hai"],
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

batchSchema.index({ createdBy: 1, name: 1 });
batchSchema.index({ createdBy: 1, status: 1, courseName: 1 });
batchSchema.index({ createdBy: 1, teacherName: 1 });

export default mongoose.model("Batch", batchSchema);
