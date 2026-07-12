import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      enum: ["certificate", "id-card"],
      default: "certificate",
    },
    certificateType: {
      type: String,
      enum: ["course-completion", "achievement", "participation", "internship", "id-card"],
      default: "course-completion",
    },
    certificateTitle: {
      type: String,
      required: [true, "Certificate / ID title required hai"],
      trim: true,
      maxlength: 140,
    },
    documentNumber: {
      type: String,
      trim: true,
      maxlength: 80,
      index: true,
    },
    studentName: {
      type: String,
      required: [true, "Student name required hai"],
      trim: true,
      maxlength: 100,
    },
    studentEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    rollNo: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    batchName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    courseName: {
      type: String,
      trim: true,
      maxlength: 140,
    },
    duration: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    grade: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    skillsCovered: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["draft", "issued", "revoked"],
      default: "issued",
    },
    photoUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    bloodGroup: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    emergencyContact: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    authorizedBy: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "Institute Director",
    },
    designation: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "Director",
    },
    instituteName: {
      type: String,
      trim: true,
      default: "NAXORA Institute",
    },
    instituteAddress: {
      type: String,
      trim: true,
      maxlength: 250,
      default: "Premium AI Powered Coaching Institute",
    },
    verificationNote: {
      type: String,
      trim: true,
      maxlength: 300,
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

certificateSchema.index({ studentName: "text", courseName: "text", batchName: "text", documentNumber: "text", certificateTitle: "text" });
certificateSchema.index({ createdBy: 1, documentType: 1, status: 1, certificateType: 1 });

certificateSchema.pre("save", function generateDocumentNumber(next) {
  if (!this.documentNumber) {
    const prefix = this.documentType === "id-card" ? "NAX-ID" : "NAX-CERT";
    const year = new Date(this.issueDate || Date.now()).getFullYear();
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    this.documentNumber = `${prefix}-${year}-${code}`;
  }
  next();
});

export default mongoose.model("Certificate", certificateSchema);
