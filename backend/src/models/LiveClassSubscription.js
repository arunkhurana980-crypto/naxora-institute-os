import mongoose from "mongoose";

const liveClassSubscriptionSchema = new mongoose.Schema(
  {
    instituteName: { type: String, required: [true, "Institute name required hai"], trim: true, maxlength: 180, index: true },
    planName: { type: String, enum: ["Live Starter", "Live Pro", "Live Premium", "Live Enterprise"], default: "Live Starter", index: true },
    billingCycle: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    price: { type: Number, min: 0, default: 999 },
    maxLiveClasses: { type: Number, min: 1, default: 30 },
    maxStudentsPerClass: { type: Number, min: 1, default: 100 },
    recordingHours: { type: Number, min: 0, default: 10 },
    commentsEnabled: { type: Boolean, default: true },
    status: { type: String, enum: ["trial", "active", "past_due", "paused", "cancelled", "expired"], default: "trial", index: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    paymentMode: { type: String, enum: ["cash", "upi", "bank", "razorpay", "card", "other"], default: "upi" },
    lastPaymentAmount: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

liveClassSubscriptionSchema.index({ createdBy: 1, status: 1, planName: 1 });

export default mongoose.model("LiveClassSubscription", liveClassSubscriptionSchema);
