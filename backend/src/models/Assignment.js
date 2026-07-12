import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: [true, "Student name required hai"],
      trim: true,
      maxlength: 80,
    },
    status: {
      type: String,
      enum: ["pending", "submitted", "checked"],
      default: "pending",
    },
    marks: {
      type: Number,
      default: 0,
      min: 0,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    submittedAt: {
      type: Date,
    },
    checkedAt: {
      type: Date,
    },
  },
  { _id: true }
);

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Assignment title required hai"],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: [true, "Assignment description required hai"],
      trim: true,
      maxlength: 3000,
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
    batchName: {
      type: String,
      required: [true, "Batch name required hai"],
      trim: true,
      maxlength: 100,
    },
    assignedTo: {
      type: String,
      enum: ["batch", "student"],
      default: "batch",
    },
    studentName: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    teacherName: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    dueDate: {
      type: Date,
      required: [true, "Due date required hai"],
    },
    maxMarks: {
      type: Number,
      default: 100,
      min: 0,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },
    status: {
      type: String,
      enum: ["draft", "active", "closed"],
      default: "active",
    },
    submissionStatus: {
      type: String,
      enum: ["pending", "submitted", "checked"],
      default: "pending",
    },
    teacherRemarks: {
      type: String,
      trim: true,
      maxlength: 1500,
    },
    resourceLink: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    submissions: [submissionSchema],
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

assignmentSchema.index({ title: "text", subject: "text", topic: "text", batchName: "text", studentName: "text", teacherName: "text", description: "text", teacherRemarks: "text" });

export default mongoose.model("Assignment", assignmentSchema);
