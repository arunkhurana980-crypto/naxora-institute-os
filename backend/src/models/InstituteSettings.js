import mongoose from "mongoose";

const instituteSettingsSchema = new mongoose.Schema(
  {
    instituteName: { type: String, trim: true, maxlength: 160, default: "NAXORA Institute" },
    legalName: { type: String, trim: true, maxlength: 180, default: "" },
    tagline: { type: String, trim: true, maxlength: 220, default: "AI-powered coaching management" },
    logoUrl: { type: String, trim: true, maxlength: 700, default: "" },
    brandColor: { type: String, trim: true, maxlength: 20, default: "#D4AF37" },
    accentColor: { type: String, trim: true, maxlength: 20, default: "#00D4FF" },
    themeMode: { type: String, enum: ["dark", "light", "system"], default: "dark", index: true },

    ownerName: { type: String, trim: true, maxlength: 120, default: "" },
    ownerPhone: { type: String, trim: true, maxlength: 30, default: "" },
    ownerEmail: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },
    supportPhone: { type: String, trim: true, maxlength: 30, default: "" },
    supportEmail: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },
    websiteUrl: { type: String, trim: true, maxlength: 300, default: "" },

    addressLine1: { type: String, trim: true, maxlength: 220, default: "" },
    addressLine2: { type: String, trim: true, maxlength: 220, default: "" },
    city: { type: String, trim: true, maxlength: 90, default: "" },
    district: { type: String, trim: true, maxlength: 90, default: "" },
    state: { type: String, trim: true, maxlength: 90, default: "Haryana" },
    pinCode: { type: String, trim: true, maxlength: 20, default: "" },

    academicYearName: { type: String, trim: true, maxlength: 80, default: "2026-27" },
    academicStartDate: { type: Date, default: null },
    academicEndDate: { type: Date, default: null },
    workingDays: [{ type: String, enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] }],
    openingTime: { type: String, trim: true, maxlength: 12, default: "08:00" },
    closingTime: { type: String, trim: true, maxlength: 12, default: "20:00" },

    receiptPrefix: { type: String, trim: true, maxlength: 20, default: "NXR-RCPT" },
    receiptFooter: { type: String, trim: true, maxlength: 500, default: "Thank you for choosing NAXORA Institute." },
    invoiceNote: { type: String, trim: true, maxlength: 700, default: "Fees once paid are subject to institute policy." },
    taxEnabled: { type: Boolean, default: false },
    taxName: { type: String, trim: true, maxlength: 30, default: "GST" },
    taxPercent: { type: Number, min: 0, max: 100, default: 0 },

    certificatePrefix: { type: String, trim: true, maxlength: 25, default: "NXR-CERT" },
    certificateAuthority: { type: String, trim: true, maxlength: 120, default: "Director" },
    certificateSignatureUrl: { type: String, trim: true, maxlength: 700, default: "" },
    certificateSealUrl: { type: String, trim: true, maxlength: 700, default: "" },

    defaultAttendanceRule: { type: String, enum: ["strict", "normal", "flexible"], default: "normal" },
    minimumAttendancePercent: { type: Number, min: 0, max: 100, default: 75 },
    feeDueDay: { type: Number, min: 1, max: 31, default: 10 },
    lateFeeEnabled: { type: Boolean, default: false },
    lateFeeAmount: { type: Number, min: 0, default: 0 },

    studentIdPrefix: { type: String, trim: true, maxlength: 20, default: "NXR-STU" },
    teacherIdPrefix: { type: String, trim: true, maxlength: 20, default: "NXR-TCH" },
    branchCodePrefix: { type: String, trim: true, maxlength: 20, default: "NXR-BR" },

    whatsappEnabled: { type: Boolean, default: false },
    emailEnabled: { type: Boolean, default: false },
    smsEnabled: { type: Boolean, default: false },
    autoBackupEnabled: { type: Boolean, default: false },

    notes: { type: String, trim: true, maxlength: 1500, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  },
  { timestamps: true }
);

instituteSettingsSchema.index({ instituteName: "text", city: "text", ownerName: "text" });

export default mongoose.model("InstituteSettings", instituteSettingsSchema);
