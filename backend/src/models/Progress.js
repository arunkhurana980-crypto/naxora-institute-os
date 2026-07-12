import mongoose from "mongoose";

const subjectProgressSchema = new mongoose.Schema(
  {
    subject: { type: String, trim: true, required: true },
    currentScore: { type: Number, min: 0, max: 100, default: 0 },
    previousScore: { type: Number, min: 0, max: 100, default: 0 },
    attendancePercent: { type: Number, min: 0, max: 100, default: 0 },
    homeworkCompletion: { type: Number, min: 0, max: 100, default: 0 },
    testPerformance: { type: Number, min: 0, max: 100, default: 0 },
    status: {
      type: String,
      enum: ["excellent", "good", "improving", "needs_attention", "critical"],
      default: "improving",
    },
    weakAreas: { type: String, trim: true, maxlength: 350, default: "" },
    improvementPlan: { type: String, trim: true, maxlength: 450, default: "" },
  },
  { _id: true }
);

const progressSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: [true, "Student name required hai"],
      trim: true,
      minlength: [2, "Student name minimum 2 characters ka ho"],
      maxlength: [80, "Student name maximum 80 characters ka ho"],
    },
    rollNo: { type: String, trim: true, maxlength: 40, default: "" },
    courseName: { type: String, trim: true, maxlength: 120, default: "" },
    batchName: { type: String, trim: true, maxlength: 120, default: "" },
    classLevel: { type: String, trim: true, maxlength: 60, default: "" },
    reportMonth: { type: String, trim: true, maxlength: 30, default: "" },
    mentorName: { type: String, trim: true, maxlength: 80, default: "" },
    overallScore: { type: Number, min: 0, max: 100, default: 0 },
    improvementPercent: { type: Number, min: -100, max: 100, default: 0 },
    overallStatus: {
      type: String,
      enum: ["excellent", "good", "improving", "needs_attention", "critical"],
      default: "improving",
    },
    subjectProgress: { type: [subjectProgressSchema], default: [] },
    strengths: { type: String, trim: true, maxlength: 700, default: "" },
    weakAreas: { type: String, trim: true, maxlength: 700, default: "" },
    improvementPlan: { type: String, trim: true, maxlength: 900, default: "" },
    teacherNotes: { type: String, trim: true, maxlength: 900, default: "" },
    parentMeetingNotes: { type: String, trim: true, maxlength: 900, default: "" },
    nextReviewDate: { type: Date, default: null },
    reportStatus: {
      type: String,
      enum: ["draft", "shared", "reviewed", "archived"],
      default: "draft",
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
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

progressSchema.index({ createdBy: 1, studentName: 1 });
progressSchema.index({ createdBy: 1, batchName: 1, courseName: 1 });
progressSchema.index({ createdBy: 1, overallStatus: 1, reportStatus: 1 });
progressSchema.index({ createdBy: 1, reportMonth: 1 });

export default mongoose.model("Progress", progressSchema);
