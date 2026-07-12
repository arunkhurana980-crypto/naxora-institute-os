import mongoose from "mongoose";

const addonSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      enum: ["vani_ai", "whatsapp_sms", "advanced_reports", "extra_branch", "custom_branding"],
      default: "vani_ai",
    },
    name: { type: String, trim: true, maxlength: 120, default: "NAXORA VANI AI" },
    enabled: { type: Boolean, default: false },
    billingCycle: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    price: { type: Number, min: 0, default: 1499 },
    usageCap: { type: Number, min: 0, default: 1000 },
    usedThisCycle: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ["active", "paused", "cancelled"], default: "active" },
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    instituteName: {
      type: String,
      required: [true, "Institute name required hai"],
      trim: true,
      minlength: [2, "Institute name minimum 2 characters ka ho"],
      maxlength: [160, "Institute name maximum 160 characters ka ho"],
      index: true,
    },
    ownerName: { type: String, trim: true, maxlength: 120, default: "" },
    ownerPhone: { type: String, trim: true, maxlength: 25, default: "" },
    ownerEmail: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },
    city: { type: String, trim: true, maxlength: 100, default: "" },
    planName: {
      type: String,
      enum: ["free", "starter", "pro", "premium", "enterprise"],
      default: "starter",
      index: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
      index: true,
    },
    status: {
      type: String,
      enum: ["trial", "active", "past_due", "paused", "cancelled", "expired"],
      default: "trial",
      index: true,
    },
    startDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, default: null, index: true },
    nextBillingDate: { type: Date, default: null },
    trialEndsAt: { type: Date, default: null },
    basePrice: { type: Number, min: 0, default: 0 },
    discount: { type: Number, min: 0, default: 0 },
    lastPaymentAmount: { type: Number, min: 0, default: 0 },
    paymentMode: {
      type: String,
      enum: ["cash", "upi", "bank", "card", "razorpay", "other", "none"],
      default: "none",
    },
    limits: {
      students: { type: Number, min: 0, default: 50 },
      teachers: { type: Number, min: 0, default: 5 },
      branches: { type: Number, min: 0, default: 1 },
      aiDoubtsPerMonth: { type: Number, min: 0, default: 100 },
      storageGB: { type: Number, min: 0, default: 2 },
      users: { type: Number, min: 0, default: 5 },
    },
    usage: {
      students: { type: Number, min: 0, default: 0 },
      teachers: { type: Number, min: 0, default: 0 },
      branches: { type: Number, min: 0, default: 0 },
      aiDoubtsThisMonth: { type: Number, min: 0, default: 0 },
      storageGBUsed: { type: Number, min: 0, default: 0 },
      users: { type: Number, min: 0, default: 0 },
    },
    features: [{ type: String, trim: true, maxlength: 80 }],
    addons: [addonSchema],
    notes: { type: String, trim: true, maxlength: 1500, default: "" },
    internalTag: { type: String, trim: true, maxlength: 80, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

subscriptionSchema.index({ createdBy: 1, instituteName: 1 });
subscriptionSchema.index({ createdBy: 1, planName: 1, status: 1 });
subscriptionSchema.index({ instituteName: "text", ownerName: "text", ownerPhone: "text", ownerEmail: "text", city: "text" });

export default mongoose.model("Subscription", subscriptionSchema);
