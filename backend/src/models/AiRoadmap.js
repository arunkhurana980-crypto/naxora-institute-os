import mongoose from "mongoose";

const roadmapWeekSchema = new mongoose.Schema(
  {
    weekNo: { type: Number, required: true, min: 1, max: 104 },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    focus: { type: String, trim: true, maxlength: 500, default: "" },
    tasks: { type: [String], default: [] },
    resources: { type: [String], default: [] },
    milestone: { type: String, trim: true, maxlength: 500, default: "" },
    expectedHours: { type: Number, min: 0, max: 80, default: 5 },
  },
  { _id: true }
);

const aiRoadmapSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: [true, "Student name required hai"],
      trim: true,
      minlength: [2, "Student name minimum 2 characters ka ho"],
      maxlength: [120, "Student name maximum 120 characters ka ho"],
    },
    goal: {
      type: String,
      required: [true, "Goal required hai"],
      trim: true,
      minlength: [3, "Goal minimum 3 characters ka ho"],
      maxlength: [220, "Goal maximum 220 characters ka ho"],
    },
    currentLevel: {
      type: String,
      enum: ["beginner", "basic", "intermediate", "advanced"],
      default: "beginner",
    },
    targetLevel: {
      type: String,
      enum: ["basic", "intermediate", "advanced", "job_ready", "exam_ready"],
      default: "job_ready",
    },
    subject: { type: String, trim: true, maxlength: 120, default: "" },
    courseName: { type: String, trim: true, maxlength: 140, default: "" },
    batchName: { type: String, trim: true, maxlength: 120, default: "" },
    durationWeeks: { type: Number, min: 1, max: 52, default: 12 },
    weeklyHours: { type: Number, min: 1, max: 80, default: 8 },
    language: { type: String, enum: ["hinglish", "hindi", "english"], default: "hinglish" },
    learningStyle: { type: String, enum: ["visual", "practice", "theory", "mixed"], default: "mixed" },
    priority: { type: String, enum: ["normal", "high", "urgent"], default: "normal" },
    weakAreas: { type: [String], default: [] },
    strengths: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    weeklyPlan: { type: [roadmapWeekSchema], default: [] },
    milestones: { type: [String], default: [] },
    status: { type: String, enum: ["draft", "active", "completed", "archived"], default: "draft" },
    isPinned: { type: Boolean, default: false },
    progressPercent: { type: Number, min: 0, max: 100, default: 0 },
    notes: { type: String, trim: true, maxlength: 3000, default: "" },
    instituteName: { type: String, default: "NAXORA Institute" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

aiRoadmapSchema.index({ createdBy: 1, status: 1, subject: 1, priority: 1 });
aiRoadmapSchema.index({ studentName: "text", goal: "text", subject: "text", courseName: "text", weakAreas: "text", strengths: "text" });

export default mongoose.model("AiRoadmap", aiRoadmapSchema);
