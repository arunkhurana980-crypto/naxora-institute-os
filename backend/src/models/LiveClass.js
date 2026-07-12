import mongoose from "mongoose";

const liveClassSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Live class title required hai"], trim: true, minlength: 2, maxlength: 180, index: true },
    subject: { type: String, required: [true, "Subject required hai"], trim: true, maxlength: 100, index: true },
    topic: { type: String, trim: true, maxlength: 160, default: "" },
    batchName: { type: String, required: [true, "Batch name required hai"], trim: true, maxlength: 120, index: true },
    courseName: { type: String, trim: true, maxlength: 120, default: "" },
    teacherName: { type: String, required: [true, "Teacher name required hai"], trim: true, maxlength: 120 },
    startAt: { type: Date, required: [true, "Start date/time required hai"], index: true },
    durationMinutes: { type: Number, min: 10, max: 600, default: 60 },
    platform: { type: String, enum: ["internal", "zoom", "google_meet", "youtube", "other"], default: "internal", index: true },
    classUrl: { type: String, trim: true, maxlength: 700, default: "" },
    recordingUrl: { type: String, trim: true, maxlength: 700, default: "" },
    thumbnailUrl: { type: String, trim: true, maxlength: 700, default: "" },
    description: { type: String, trim: true, maxlength: 1800, default: "" },
    resources: [{ type: String, trim: true, maxlength: 500 }],
    status: { type: String, enum: ["scheduled", "live", "completed", "cancelled"], default: "scheduled", index: true },
    chatEnabled: { type: Boolean, default: true },
    commentsEnabled: { type: Boolean, default: true },
    liveSubscriptionRequired: { type: Boolean, default: true },
    maxStudents: { type: Number, min: 1, max: 10000, default: 100 },
    enrolledStudents: { type: Number, min: 0, default: 0 },
    totalComments: { type: Number, min: 0, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

liveClassSchema.index({ createdBy: 1, startAt: -1, status: 1 });
liveClassSchema.index({ title: "text", subject: "text", topic: "text", batchName: "text", teacherName: "text" });

export default mongoose.model("LiveClass", liveClassSchema);
