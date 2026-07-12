import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    questionType: {
      type: String,
      enum: ["mcq", "descriptive", "practical", "true_false", "short_answer"],
      default: "mcq",
    },
    questionText: {
      type: String,
      required: [true, "Question text required hai"],
      trim: true,
      maxlength: [1500, "Question bahut long hai"],
    },
    options: {
      type: [String],
      default: [],
      validate: {
        validator(options) {
          return !options || options.length <= 6;
        },
        message: "Maximum 6 options allowed hain",
      },
    },
    correctAnswer: { type: String, trim: true, maxlength: 600, default: "" },
    marks: { type: Number, min: 0, max: 100, default: 1 },
    negativeMarks: { type: Number, min: 0, max: 20, default: 0 },
    explanation: { type: String, trim: true, maxlength: 1500, default: "" },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    topic: { type: String, trim: true, maxlength: 120, default: "" },
  },
  { _id: true }
);

const questionPaperSchema = new mongoose.Schema(
  {
    paperTitle: {
      type: String,
      required: [true, "Paper title required hai"],
      trim: true,
      minlength: [3, "Paper title minimum 3 characters ka ho"],
      maxlength: [160, "Paper title maximum 160 characters ka ho"],
    },
    courseName: { type: String, trim: true, maxlength: 120, default: "" },
    batchName: { type: String, trim: true, maxlength: 120, default: "" },
    subject: {
      type: String,
      required: [true, "Subject required hai"],
      trim: true,
      maxlength: [100, "Subject maximum 100 characters ka ho"],
    },
    topic: { type: String, trim: true, maxlength: 160, default: "" },
    teacherName: { type: String, trim: true, maxlength: 100, default: "" },
    paperType: {
      type: String,
      enum: ["mcq", "descriptive", "practical", "mixed"],
      default: "mixed",
    },
    testMode: {
      type: String,
      enum: ["online", "offline", "hybrid"],
      default: "online",
    },
    durationMinutes: { type: Number, min: 1, max: 600, default: 60 },
    totalMarks: { type: Number, min: 1, max: 1000, default: 1 },
    passingMarks: { type: Number, min: 0, max: 1000, default: 0 },
    scheduledDate: { type: Date, default: null },
    startTime: { type: String, trim: true, maxlength: 20, default: "" },
    endTime: { type: String, trim: true, maxlength: 20, default: "" },
    instructions: { type: String, trim: true, maxlength: 1500, default: "" },
    questions: { type: [questionSchema], default: [] },
    attemptsAllowed: { type: Number, min: 1, max: 10, default: 1 },
    shuffleQuestions: { type: Boolean, default: true },
    showResultInstant: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["draft", "published", "assigned", "live", "closed", "archived"],
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

questionPaperSchema.index({ createdBy: 1, paperTitle: 1 });
questionPaperSchema.index({ createdBy: 1, subject: 1, batchName: 1 });
questionPaperSchema.index({ createdBy: 1, status: 1, paperType: 1, testMode: 1 });
questionPaperSchema.index({ createdBy: 1, scheduledDate: 1 });

export default mongoose.model("QuestionPaper", questionPaperSchema);
