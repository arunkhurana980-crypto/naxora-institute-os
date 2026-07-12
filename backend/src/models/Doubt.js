import mongoose from "mongoose";

const doubtSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: [true, "Student name required hai"],
      trim: true,
      maxlength: 80,
    },
    studentClass: {
      type: String,
      trim: true,
      maxlength: 80,
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
      maxlength: 120,
    },
    question: {
      type: String,
      required: [true, "Question required hai"],
      trim: true,
      minlength: [8, "Question thoda detail me likho"],
      maxlength: 2000,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },
    status: {
      type: String,
      enum: ["solved", "pending", "teacher-review"],
      default: "solved",
    },
    aiAnswer: {
      type: String,
      trim: true,
      maxlength: 9000,
    },
    shortAnswer: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    teacherReply: {
      type: String,
      trim: true,
      maxlength: 4000,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 30,
      },
    ],
    source: {
      type: String,
      enum: ["naxora-local-ai", "teacher"],
      default: "naxora-local-ai",
    },
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

doubtSchema.index({ studentName: "text", subject: "text", topic: "text", question: "text", aiAnswer: "text", teacherReply: "text" });

export default mongoose.model("Doubt", doubtSchema);
