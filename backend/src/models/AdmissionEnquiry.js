import mongoose from "mongoose";

const followUpSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    mode: {
      type: String,
      enum: ["call", "whatsapp", "visit", "demo", "email", "other"],
      default: "call",
    },
    note: { type: String, trim: true, maxlength: 700, default: "" },
    outcome: {
      type: String,
      enum: ["interested", "not_interested", "callback", "demo_booked", "converted", "no_response"],
      default: "callback",
    },
    nextFollowUpDate: { type: Date, default: null },
  },
  { timestamps: true }
);

const admissionEnquirySchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: [true, "Student name required hai"],
      trim: true,
      minlength: [2, "Student name minimum 2 characters ka ho"],
      maxlength: [120, "Student name maximum 120 characters ka ho"],
    },
    parentName: { type: String, trim: true, maxlength: 120, default: "" },
    phone: {
      type: String,
      required: [true, "Phone number required hai"],
      trim: true,
      maxlength: [25, "Phone maximum 25 characters ka ho"],
      index: true,
    },
    alternatePhone: { type: String, trim: true, maxlength: 25, default: "" },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },
    classLevel: { type: String, trim: true, maxlength: 80, default: "" },
    interestedCourse: {
      type: String,
      required: [true, "Interested course required hai"],
      trim: true,
      maxlength: [140, "Course name maximum 140 characters ka ho"],
    },
    preferredBatch: { type: String, trim: true, maxlength: 100, default: "" },
    leadSource: {
      type: String,
      enum: ["youtube", "instagram", "facebook", "friend", "walk_in", "whatsapp", "poster", "school", "website", "other"],
      default: "youtube",
      index: true,
    },
    leadTemperature: {
      type: String,
      enum: ["hot", "warm", "cold"],
      default: "warm",
      index: true,
    },
    status: {
      type: String,
      enum: ["new", "contacted", "demo_booked", "follow_up", "converted", "rejected", "lost"],
      default: "new",
      index: true,
    },
    counsellorName: { type: String, trim: true, maxlength: 120, default: "" },
    expectedFee: { type: Number, min: 0, default: 0 },
    offeredDiscount: { type: Number, min: 0, default: 0 },
    demoDate: { type: Date, default: null },
    nextFollowUpDate: { type: Date, default: null, index: true },
    city: { type: String, trim: true, maxlength: 100, default: "" },
    address: { type: String, trim: true, maxlength: 300, default: "" },
    notes: { type: String, trim: true, maxlength: 1500, default: "" },
    followUps: [followUpSchema],
    convertedStudentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
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

admissionEnquirySchema.index({ createdBy: 1, phone: 1, interestedCourse: 1 });
admissionEnquirySchema.index({ createdBy: 1, status: 1, leadTemperature: 1 });
admissionEnquirySchema.index({ studentName: "text", parentName: "text", phone: "text", interestedCourse: "text", city: "text" });

export default mongoose.model("AdmissionEnquiry", admissionEnquirySchema);
