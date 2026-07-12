import mongoose from "mongoose";

const issueRecordSchema = new mongoose.Schema(
  {
    studentName: { type: String, trim: true, maxlength: 100 },
    studentEmail: { type: String, trim: true, lowercase: true, maxlength: 120 },
    rollNo: { type: String, trim: true, maxlength: 60 },
    issueDate: { type: Date, default: Date.now },
    returnDate: { type: Date },
    status: {
      type: String,
      enum: ["issued", "returned", "overdue", "lost"],
      default: "issued",
    },
    note: { type: String, trim: true, maxlength: 400 },
  },
  { _id: true, timestamps: true }
);

const libraryItemSchema = new mongoose.Schema(
  {
    materialType: {
      type: String,
      enum: ["book", "pdf", "video", "link", "notes", "assignment", "other"],
      default: "book",
      index: true,
    },
    title: {
      type: String,
      required: [true, "Material title required hai"],
      trim: true,
      maxlength: 180,
    },
    subject: {
      type: String,
      required: [true, "Subject required hai"],
      trim: true,
      maxlength: 120,
      index: true,
    },
    topic: { type: String, trim: true, maxlength: 140 },
    author: { type: String, trim: true, maxlength: 120 },
    courseName: { type: String, trim: true, maxlength: 140 },
    batchName: { type: String, trim: true, maxlength: 120 },
    classLevel: { type: String, trim: true, maxlength: 80 },
    language: {
      type: String,
      enum: ["Hindi", "English", "Hinglish", "Other"],
      default: "Hinglish",
    },
    difficulty: {
      type: String,
      enum: ["basic", "medium", "advanced", "expert"],
      default: "basic",
    },
    format: {
      type: String,
      enum: ["physical", "digital", "both"],
      default: "digital",
    },
    materialUrl: {
      type: String,
      trim: true,
      maxlength: 700,
    },
    storageLocation: { type: String, trim: true, maxlength: 220 },
    totalCopies: {
      type: Number,
      min: 0,
      default: 1,
    },
    availableCopies: {
      type: Number,
      min: 0,
      default: 1,
    },
    tags: { type: String, trim: true, maxlength: 400 },
    status: {
      type: String,
      enum: ["active", "archived", "draft"],
      default: "active",
      index: true,
    },
    accessLevel: {
      type: String,
      enum: ["all", "students", "teachers", "batch-only", "admin-only"],
      default: "students",
    },
    description: { type: String, trim: true, maxlength: 1800 },
    issueRecords: [issueRecordSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

libraryItemSchema.index({ title: "text", subject: "text", topic: "text", author: "text", batchName: "text", courseName: "text", tags: "text" });
libraryItemSchema.index({ createdBy: 1, materialType: 1, status: 1, format: 1, difficulty: 1 });

libraryItemSchema.pre("validate", function normalizeCopies(next) {
  if (this.format === "digital") {
    this.totalCopies = Math.max(Number(this.totalCopies || 1), 1);
    this.availableCopies = Math.max(Number(this.availableCopies || 1), 1);
  }
  if (Number(this.availableCopies) > Number(this.totalCopies)) {
    this.availableCopies = this.totalCopies;
  }
  next();
});

export default mongoose.model("LibraryItem", libraryItemSchema);
