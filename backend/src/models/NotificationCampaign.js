import mongoose from "mongoose";

const deliveryLogSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ["whatsapp", "sms"], required: true },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    status: { type: String, enum: ["queued", "sent", "failed", "skipped"], default: "queued" },
    provider: { type: String, trim: true, maxlength: 60, default: "mock" },
    providerMessageId: { type: String, trim: true, maxlength: 160, default: "" },
    errorMessage: { type: String, trim: true, maxlength: 500, default: "" },
    sentAt: { type: Date },
  },
  { _id: true, timestamps: true }
);

const notificationCampaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Notification title required hai"],
      trim: true,
      minlength: [2, "Title minimum 2 characters ka ho"],
      maxlength: [160, "Title maximum 160 characters ka ho"],
    },
    message: {
      type: String,
      required: [true, "Message required hai"],
      trim: true,
      minlength: [3, "Message minimum 3 characters ka ho"],
      maxlength: [1200, "Message maximum 1200 characters ka ho"],
    },
    channel: {
      type: String,
      enum: ["whatsapp", "sms", "both"],
      default: "whatsapp",
    },
    provider: {
      type: String,
      enum: ["mock", "whatsapp_cloud", "twilio", "msg91", "fast2sms", "other"],
      default: "mock",
    },
    templateType: {
      type: String,
      enum: ["general", "fees", "attendance", "exam", "holiday", "homework", "admission", "followup", "payment"],
      default: "general",
    },
    targetAudience: {
      type: String,
      enum: ["all", "students", "parents", "teachers", "staff", "batch", "single"],
      default: "students",
    },
    targetName: { type: String, trim: true, maxlength: 140, default: "" },
    targetPhone: { type: String, trim: true, maxlength: 30, default: "" },
    targetBatch: { type: String, trim: true, maxlength: 120, default: "" },
    priority: { type: String, enum: ["normal", "high", "urgent"], default: "normal" },
    status: {
      type: String,
      enum: ["draft", "scheduled", "queued", "sent", "failed", "cancelled"],
      default: "draft",
    },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    sentCount: { type: Number, min: 0, default: 0 },
    failedCount: { type: Number, min: 0, default: 0 },
    estimatedRecipients: { type: Number, min: 0, default: 1 },
    lastSendStatus: { type: String, trim: true, maxlength: 500, default: "Not sent yet" },
    tags: { type: [String], default: [] },
    deliveryLogs: { type: [deliveryLogSchema], default: [] },
    notes: { type: String, trim: true, maxlength: 1500, default: "" },
    instituteName: { type: String, default: "NAXORA Institute" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

notificationCampaignSchema.index({ createdBy: 1, status: 1, channel: 1, priority: 1, templateType: 1 });
notificationCampaignSchema.index({ title: "text", message: "text", targetName: "text", targetBatch: "text", tags: "text" });

export default mongoose.model("NotificationCampaign", notificationCampaignSchema);
