import mongoose from "mongoose";

const timetableSlotSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Class title required hai"],
      trim: true,
      minlength: [2, "Title minimum 2 characters ka ho"],
      maxlength: [140, "Title maximum 140 characters ka ho"],
    },
    timetableType: {
      type: String,
      enum: ["batch", "teacher", "student", "room", "exam", "event", "other"],
      default: "batch",
      index: true,
    },
    batchName: { type: String, trim: true, maxlength: 120, default: "" },
    courseName: { type: String, trim: true, maxlength: 120, default: "" },
    teacherName: { type: String, trim: true, maxlength: 120, default: "" },
    subject: {
      type: String,
      required: [true, "Subject required hai"],
      trim: true,
      maxlength: [120, "Subject maximum 120 characters ka ho"],
    },
    room: { type: String, trim: true, maxlength: 80, default: "" },
    dayOfWeek: {
      type: String,
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      required: [true, "Day required hai"],
      index: true,
    },
    startTime: {
      type: String,
      required: [true, "Start time required hai"],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Start time HH:mm format me hona chahiye"],
    },
    endTime: {
      type: String,
      required: [true, "End time required hai"],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "End time HH:mm format me hona chahiye"],
    },
    durationMinutes: { type: Number, min: 1, max: 600, default: 60 },
    classMode: {
      type: String,
      enum: ["offline", "online", "hybrid"],
      default: "offline",
    },
    meetingLink: { type: String, trim: true, maxlength: 500, default: "" },
    priority: {
      type: String,
      enum: ["normal", "high", "urgent"],
      default: "normal",
    },
    status: {
      type: String,
      enum: ["draft", "active", "cancelled", "completed"],
      default: "active",
      index: true,
    },
    recurringFrom: { type: Date, default: null },
    recurringTo: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 1500, default: "" },
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

timetableSlotSchema.index({ createdBy: 1, dayOfWeek: 1, startTime: 1 });
timetableSlotSchema.index({ createdBy: 1, teacherName: 1, dayOfWeek: 1 });
timetableSlotSchema.index({ createdBy: 1, batchName: 1, dayOfWeek: 1 });
timetableSlotSchema.index({ title: "text", subject: "text", batchName: "text", teacherName: "text", room: "text" });

export default mongoose.model("TimetableSlot", timetableSlotSchema);
