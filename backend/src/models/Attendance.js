import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: [true, "Student name required hai"],
      trim: true,
      minlength: [2, "Student name minimum 2 characters ka ho"],
      maxlength: [90, "Student name bahut long hai"],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, "Phone number bahut long hai"],
      default: "",
    },
    status: {
      type: String,
      enum: ["present", "absent", "late", "leave"],
      default: "present",
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [250, "Remarks bahut long hain"],
      default: "",
    },
  },
  { _id: true }
);

const attendanceSchema = new mongoose.Schema(
  {
    batchName: {
      type: String,
      required: [true, "Batch name required hai"],
      trim: true,
      minlength: [2, "Batch name minimum 2 characters ka ho"],
      maxlength: [120, "Batch name bahut long hai"],
    },
    courseName: {
      type: String,
      trim: true,
      maxlength: [120, "Course name bahut long hai"],
      default: "",
    },
    teacherName: {
      type: String,
      trim: true,
      maxlength: [100, "Teacher name bahut long hai"],
      default: "",
    },
    attendanceDate: {
      type: Date,
      required: [true, "Attendance date required hai"],
      index: true,
    },
    classTiming: {
      type: String,
      trim: true,
      maxlength: [80, "Class timing bahut long hai"],
      default: "",
    },
    topicCovered: {
      type: String,
      trim: true,
      maxlength: [180, "Topic covered bahut long hai"],
      default: "",
    },
    sessionStatus: {
      type: String,
      enum: ["completed", "cancelled", "extra_class"],
      default: "completed",
    },
    records: {
      type: [attendanceRecordSchema],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "Kam se kam 1 student ka attendance record add karo",
      },
    },
    totalStudents: { type: Number, default: 0 },
    presentCount: { type: Number, default: 0 },
    absentCount: { type: Number, default: 0 },
    lateCount: { type: Number, default: 0 },
    leaveCount: { type: Number, default: 0 },
    notes: {
      type: String,
      trim: true,
      maxlength: [700, "Notes bahut long hain"],
      default: "",
    },
    instituteName: {
      type: String,
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

attendanceSchema.index({ createdBy: 1, attendanceDate: -1 });
attendanceSchema.index({ createdBy: 1, batchName: 1, attendanceDate: -1 });
attendanceSchema.index({ createdBy: 1, sessionStatus: 1 });

export default mongoose.model("Attendance", attendanceSchema);
