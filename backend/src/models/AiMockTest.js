import mongoose from "mongoose";

const mockQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 1200 },
    questionType: {
      type: String,
      enum: ["mcq", "true_false", "short_answer", "descriptive"],
      default: "mcq",
    },
    options: { type: [String], default: [] },
    correctAnswer: { type: String, trim: true, maxlength: 500, default: "" },
    explanation: { type: String, trim: true, maxlength: 2000, default: "" },
    marks: { type: Number, min: 1, max: 100, default: 1 },
  },
  { _id: true }
);

const aiMockTestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Mock test title required hai"],
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
    language: { type: String, enum: ["hinglish", "hindi", "english"], default: "hinglish" },
    difficulty: { type: String, enum: ["easy", "medium", "advanced"], default: "medium" },
    examFocus: { type: String, enum: ["boards", "jee", "neet", "nda", "upsc", "coding", "school", "general"], default: "coding" },
    testMode: { type: String, enum: ["practice", "exam", "quick_revision", "homework"], default: "practice" },
    durationMinutes: { type: Number, min: 5, max: 300, default: 30 },
    totalMarks: { type: Number, min: 1, default: 0 },
    questionCount: { type: Number, min: 1, max: 100, default: 10 },
    instructions: { type: String, trim: true, maxlength: 3000, default: "" },
    sourceInput: { type: String, trim: true, maxlength: 5000, default: "" },
    questions: { type: [mockQuestionSchema], default: [] },
    answerKey: { type: [String], default: [] },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
    isPinned: { type: Boolean, default: false },
    attempts: { type: Number, default: 0, min: 0 },
    tags: { type: [String], default: [] },
    instituteName: { type: String, default: "NAXORA Institute" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

aiMockTestSchema.pre("validate", function calcTotals(next) {
  this.totalMarks = (this.questions || []).reduce((sum, item) => sum + Number(item.marks || 0), 0);
  this.questionCount = (this.questions || []).length || this.questionCount || 1;
  this.answerKey = (this.questions || []).map((item, index) => `${index + 1}. ${item.correctAnswer || "Answer pending"}`);
  next();
});

aiMockTestSchema.index({ createdBy: 1, subject: 1, topic: 1, status: 1 });
aiMockTestSchema.index({ createdBy: 1, difficulty: 1, examFocus: 1, testMode: 1 });
aiMockTestSchema.index({ title: "text", subject: "text", topic: "text", sourceInput: "text", tags: "text" });

export default mongoose.model("AiMockTest", aiMockTestSchema);
