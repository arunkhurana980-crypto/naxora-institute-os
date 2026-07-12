import mongoose from "mongoose";

const emailDeliveryLogSchema = new mongoose.Schema(
  {
    email: { type: String, trim: true, lowercase: true, maxlength: 180, default: "" },
    status: { type: String, enum: ["queued", "sent", "failed", "skipped", "mock_sent"], default: "queued" },
    provider: { type: String, trim: true, maxlength: 60, default: "mock" },
    providerMessageId: { type: String, trim: true, maxlength: 160, default: "" },
    errorMessage: { type: String, trim: true, maxlength: 500, default: "" },
    sentAt: { type: Date },
  },
  { _id: true, timestamps: true }
);

const emailCampaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Email campaign title required hai"],
      trim: true,
      minlength: [2, "Title minimum 2 characters ka ho"],
      maxlength: [160, "Title maximum 160 characters ka ho"],
    },
    subject: {
      type: String,
      required: [true, "Email subject required hai"],
      trim: true,
      minlength: [3, "Subject minimum 3 characters ka ho"],
      maxlength: [180, "Subject maximum 180 characters ka ho"],
    },
    body: {
      type: String,
      required: [true, "Email body required hai"],
      trim: true,
      minlength: [5, "Email body minimum 5 characters ka ho"],
      maxlength: [8000, "Email body maximum 8000 characters ka ho"],
    },
    provider: {
      type: String,
      enum: ["mock", "smtp", "sendgrid", "mailgun", "other"],
      default: "mock",
    },
    templateType: {
      type: String,
      enum: ["general", "fees", "attendance", "exam", "holiday", "homework", "admission", "followup", "payment", "certificate", "result"],
      default: "general",
    },
    targetAudience: {
      type: String,
      enum: ["all", "students", "parents", "teachers", "staff", "batch", "single"],
      default: "students",
    },
    targetName: { type: String, trim: true, maxlength: 140, default: "" },
    targetEmail: { type: String, trim: true, lowercase: true, maxlength: 180, default: "" },
    targetBatch: { type: String, trim: true, maxlength: 120, default: "" },
    fromName: { type: String, trim: true, maxlength: 120, default: "NAXORA Institute OS" },
    fromEmail: { type: String, trim: true, lowercase: true, maxlength: 180, default: "" },
    replyTo: { type: String, trim: true, lowercase: true, maxlength: 180, default: "" },
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
    lastSendStatus: { type: String, trim: true, maxlength: 600, default: "Not sent yet" },
    tags: { type: [String], default: [] },
    deliveryLogs: { type: [emailDeliveryLogSchema], default: [] },
    notes: { type: String, trim: true, maxlength: 1800, default: "" },
    instituteName: { type: String, default: "NAXORA Institute" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

emailCampaignSchema.index({ createdBy: 1, status: 1, provider: 1, priority: 1, templateType: 1 });
emailCampaignSchema.index({ title: "text", subject: "text", body: "text", targetName: "text", targetBatch: "text", tags: "text" });

export default mongoose.model("EmailCampaign", emailCampaignSchema);
