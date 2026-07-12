import mongoose from "mongoose";

const instituteListingSchema = new mongoose.Schema(
  {
    instituteName: { type: String, required: [true, "Institute name required hai"], trim: true, minlength: 2, maxlength: 180, index: true },
    tagline: { type: String, trim: true, maxlength: 180, default: "" },
    ownerName: { type: String, trim: true, maxlength: 120, default: "" },
    phone: { type: String, required: [true, "Institute phone required hai"], trim: true, maxlength: 25, index: true },
    whatsapp: { type: String, trim: true, maxlength: 25, default: "" },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },
    city: { type: String, required: [true, "City required hai"], trim: true, maxlength: 100, index: true },
    area: { type: String, trim: true, maxlength: 120, default: "", index: true },
    district: { type: String, trim: true, maxlength: 120, default: "" },
    state: { type: String, trim: true, maxlength: 120, default: "Haryana" },
    address: { type: String, trim: true, maxlength: 350, default: "" },
    courses: [{ type: String, trim: true, maxlength: 100 }],
    classLevels: [{ type: String, trim: true, maxlength: 80 }],
    feesRange: { type: String, trim: true, maxlength: 120, default: "Contact institute" },
    mode: { type: String, enum: ["offline", "online", "hybrid"], default: "offline", index: true },
    logoUrl: { type: String, trim: true, maxlength: 500, default: "" },
    coverUrl: { type: String, trim: true, maxlength: 500, default: "" },
    description: { type: String, trim: true, maxlength: 1800, default: "" },
    facilities: [{ type: String, trim: true, maxlength: 80 }],
    rating: { type: Number, min: 0, max: 5, default: 4.5 },
    verifiedByNaxora: { type: Boolean, default: true, index: true },
    isPublished: { type: Boolean, default: true, index: true },
    subscriptionStatus: { type: String, enum: ["trial", "active", "premium", "paused", "expired"], default: "active", index: true },
    leadCount: { type: Number, min: 0, default: 0 },
    profileViews: { type: Number, min: 0, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

instituteListingSchema.index({ city: 1, area: 1, isPublished: 1, subscriptionStatus: 1 });
instituteListingSchema.index({ instituteName: "text", city: "text", area: "text", courses: "text", classLevels: "text", description: "text" });

export default mongoose.model("InstituteListing", instituteListingSchema);
