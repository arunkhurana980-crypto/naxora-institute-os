import mongoose from "mongoose";

const resultRowSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: [true, "Student name required hai"],
      trim: true,
      maxlength: 80,
    },
    rollNo: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    marksObtained: {
      type: Number,
      default: 0,
      min: 0,
    },
    grade: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    rank: {
      type: Number,
      default: 0,
      min: 0,
    },
    resultStatus: {
      type: String,
      enum: ["pending", "pass", "fail", "absent"],
      default: "pending",
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { _id: true }
);

const testResultSchema = new mongoose.Schema(
  {
    testTitle: {
      type: String,
      required: [true, "Test title required hai"],
      trim: true,
      maxlength: 140,
    },
    testType: {
      type: String,
      enum: ["mcq", "descriptive", "mixed", "practical", "oral"],
      default: "mixed",
    },
    subject: {
      type: String,
      required: [true, "Subject required hai"],
      trim: true,
      maxlength: 80,
    },
    topic: {
      type: String,
      trim: true,
      maxlength: 140,
    },
    batchName: {
      type: String,
      required: [true, "Batch name required hai"],
      trim: true,
      maxlength: 100,
    },
    teacherName: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    examDate: {
      type: Date,
      required: [true, "Exam date required hai"],
    },
    durationMinutes: {
      type: Number,
      default: 60,
      min: 0,
    },
    totalMarks: {
      type: Number,
      default: 100,
      min: 1,
    },
    passingMarks: {
      type: Number,
      default: 33,
      min: 0,
    },
    mode: {
      type: String,
      enum: ["offline", "online", "hybrid"],
      default: "offline",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "completed", "published"],
      default: "scheduled",
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: 3000,
    },
    results: [resultRowSchema],
    instituteName: {
      type: String,
      trim: true,
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

testResultSchema.index({
  testTitle: "text",
  subject: "text",
  topic: "text",
  batchName: "text",
  teacherName: "text",
  instructions: "text",
});

export default mongoose.model("TestResult", testResultSchema);
