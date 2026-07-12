import mongoose from "mongoose";

const announcementReadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Announcement title required hai"],
      trim: true,
      maxlength: 140,
    },
    message: {
      type: String,
      required: [true, "Announcement message required hai"],
      trim: true,
      maxlength: 4000,
    },
    category: {
      type: String,
      enum: ["general", "fees", "attendance", "exam", "holiday", "homework", "event"],
      default: "general",
    },
    priority: {
      type: String,
      enum: ["normal", "high", "urgent"],
      default: "normal",
    },
    targetAudience: {
      type: String,
      enum: ["all", "students", "teachers", "parents", "batch", "staff"],
      default: "all",
    },
    batchName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
    },
    publishAt: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
    },
    actionLabel: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    actionLink: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    readBy: [announcementReadSchema],
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

announcementSchema.index({ title: "text", message: "text", batchName: "text", category: "text" });
announcementSchema.index({ createdBy: 1, status: 1, priority: 1, targetAudience: 1 });

export default mongoose.model("Announcement", announcementSchema);
