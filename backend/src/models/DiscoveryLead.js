import mongoose from "mongoose";

const discoveryLeadSchema = new mongoose.Schema(
  {
    instituteListing: { type: mongoose.Schema.Types.ObjectId, ref: "InstituteListing", required: true, index: true },
    instituteOwner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    instituteName: { type: String, trim: true, maxlength: 180, default: "" },
    studentName: { type: String, required: [true, "Student name required hai"], trim: true, minlength: 2, maxlength: 120 },
    parentName: { type: String, trim: true, maxlength: 120, default: "" },
    phone: { type: String, required: [true, "Phone required hai"], trim: true, maxlength: 25, index: true },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },
    city: { type: String, trim: true, maxlength: 100, default: "" },
    area: { type: String, trim: true, maxlength: 120, default: "" },
    classLevel: { type: String, trim: true, maxlength: 80, default: "" },
    interestedCourse: { type: String, required: [true, "Interested course required hai"], trim: true, maxlength: 140 },
    message: { type: String, trim: true, maxlength: 900, default: "" },
    status: { type: String, enum: ["new", "contacted", "demo_booked", "converted", "not_interested", "lost"], default: "new", index: true },
    leadTemperature: { type: String, enum: ["hot", "warm", "cold"], default: "warm", index: true },
    source: { type: String, enum: ["student_discovery", "public_search", "landing_page"], default: "student_discovery" },
    notes: { type: String, trim: true, maxlength: 900, default: "" },
  },
  { timestamps: true }
);

discoveryLeadSchema.index({ instituteOwner: 1, status: 1, createdAt: -1 });
discoveryLeadSchema.index({ studentName: "text", phone: "text", interestedCourse: "text", city: "text", area: "text" });

export default mongoose.model("DiscoveryLead", discoveryLeadSchema);
