import mongoose from "mongoose";

const questionBankItemSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: [true, "Question text required hai"],
      trim: true,
      minlength: [5, "Question minimum 5 characters ka ho"],
      maxlength: [2000, "Question bahut long hai"],
    },
    questionType: {
      type: String,
      enum: ["mcq", "true_false", "short_answer", "descriptive", "practical", "case_study"],
      default: "mcq",
    },
    subject: {
      type: String,
      required: [true, "Subject required hai"],
      trim: true,
      maxlength: [100, "Subject maximum 100 characters ka ho"],
    },
    chapter: {
      type: String,
      required: [true, "Chapter required hai"],
      trim: true,
      maxlength: [140, "Chapter maximum 140 characters ka ho"],
    },
    topic: { type: String, trim: true, maxlength: 160, default: "" },
    courseName: { type: String, trim: true, maxlength: 120, default: "" },
    batchName: { type: String, trim: true, maxlength: 120, default: "" },
    classLevel: { type: String, trim: true, maxlength: 80, default: "" },
    examTag: {
      type: String,
      enum: ["boards", "jee", "neet", "nda", "upsc", "coding", "school", "other"],
      default: "coding",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    language: {
      type: String,
      enum: ["hinglish", "hindi", "english"],
      default: "hinglish",
    },
    options: {
      type: [String],
      default: [],
      validate: {
        validator(options) {
          return !options || options.length <= 8;
        },
        message: "Maximum 8 options allowed hain",
      },
    },
    correctAnswer: { type: String, trim: true, maxlength: 1000, default: "" },
    explanation: { type: String, trim: true, maxlength: 2500, default: "" },
    marks: { type: Number, min: 0, max: 100, default: 1 },
    negativeMarks: { type: Number, min: 0, max: 20, default: 0 },
    sourceType: {
      type: String,
      enum: ["manual", "ai_generated", "previous_test", "book", "youtube_class", "imported"],
      default: "manual",
    },
    tags: { type: [String], default: [] },
    usageCount: { type: Number, min: 0, default: 0 },
    lastUsedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["draft", "reviewed", "approved", "archived"],
      default: "draft",
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

questionBankItemSchema.index({ createdBy: 1, subject: 1, chapter: 1, topic: 1 });
questionBankItemSchema.index({ createdBy: 1, questionType: 1, difficulty: 1, status: 1 });
questionBankItemSchema.index({ createdBy: 1, examTag: 1, classLevel: 1 });
questionBankItemSchema.index({ questionText: "text", subject: "text", chapter: "text", topic: "text", tags: "text" });

export default mongoose.model("QuestionBankItem", questionBankItemSchema);
