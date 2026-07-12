import mongoose from "mongoose";

const superAdminActionSchema = new mongoose.Schema(
  {
    actionType: {
      type: String,
      enum: ["note", "block", "unblock", "plan_change", "status_change", "payment_note", "support_note"],
      default: "note",
      index: true,
    },
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", default: null, index: true },
    instituteName: { type: String, trim: true, maxlength: 160, default: "" },
    title: { type: String, trim: true, maxlength: 160, default: "" },
    note: { type: String, trim: true, maxlength: 1500, default: "" },
    oldValue: { type: String, trim: true, maxlength: 120, default: "" },
    newValue: { type: String, trim: true, maxlength: 120, default: "" },
    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

superAdminActionSchema.index({ createdBy: 1, createdAt: -1 });
superAdminActionSchema.index({ instituteName: "text", title: "text", note: "text" });

export default mongoose.model("SuperAdminAction", superAdminActionSchema);
