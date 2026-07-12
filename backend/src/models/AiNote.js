import mongoose from "mongoose";

const aiNoteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Notes title required hai"],
      trim: true,
      minlength: [3, "Title minimum 3 characters ka ho"],
      maxlength: [180, "Title bahut long hai"],
    },
    subject: {
      type: String,
      required: [true, "Subject required hai"],
      trim: true,
      maxlength: [120, "Subject maximum 120 characters ka ho"],
    },
    topic: {
      type: String,
      required: [true, "Topic required hai"],
      trim: true,
      maxlength: [180, "Topic maximum 180 characters ka ho"],
    },
    classLevel: { type: String, trim: true, maxlength: 80, default: "" },
    courseName: { type: String, trim: true, maxlength: 120, default: "" },
    batchName: { type: String, trim: true, maxlength: 120, default: "" },
    noteType: {
      type: String,
      enum: ["class_notes", "revision", "short_notes", "deep_notes", "cheat_sheet", "youtube_script_notes"],
      default: "class_notes",
    },
    language: {
      type: String,
      enum: ["hinglish", "hindi", "english"],
      default: "hinglish",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "advanced"],
      default: "medium",
    },
    examFocus: {
      type: String,
      enum: ["boards", "jee", "neet", "nda", "upsc", "coding", "school", "general"],
      default: "coding",
    },
    sourceInput: { type: String, trim: true, maxlength: 5000, default: "" },
    keyPoints: { type: [String], default: [] },
    generatedNotes: {
      type: String,
      required: [true, "Generated notes required hain"],
      trim: true,
      maxlength: [20000, "Notes bahut long hain"],
    },
    summary: { type: String, trim: true, maxlength: 2000, default: "" },
    practiceQuestions: { type: [String], default: [] },
    homework: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    isPinned: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
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

aiNoteSchema.index({ createdBy: 1, subject: 1, topic: 1, status: 1 });
aiNoteSchema.index({ createdBy: 1, noteType: 1, difficulty: 1, examFocus: 1 });
aiNoteSchema.index({ title: "text", subject: "text", topic: "text", sourceInput: "text", generatedNotes: "text", tags: "text" });

export default mongoose.model("AiNote", aiNoteSchema);
