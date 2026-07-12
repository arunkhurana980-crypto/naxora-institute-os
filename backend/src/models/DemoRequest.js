import mongoose from "mongoose";

const demoRequestSchema = new mongoose.Schema(
  {
    instituteName: { type: String, trim: true, required: true },
    ownerName: { type: String, trim: true, required: true },
    phone: { type: String, trim: true, required: true },
    city: { type: String, trim: true, required: true },
    instituteType: { type: String, default: "Coaching Institute" },
    interestedPlan: { type: String, default: "Premium" },
    message: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["New", "Contacted", "Demo Booked", "Converted", "Lost"],
      default: "New",
    },
  },
  { timestamps: true }
);

export default mongoose.models.DemoRequest || mongoose.model("DemoRequest", demoRequestSchema);
