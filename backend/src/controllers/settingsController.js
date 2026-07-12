import InstituteSettings from "../models/InstituteSettings.js";

function clean(value = "") { return String(value || "").trim(); }
function enumValue(value, allowed, fallback) { return allowed.includes(value) ? value : fallback; }
function numberValue(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}
function boolValue(value) { return value === true || value === "true" || value === "on" || value === "1"; }
function dateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function workingDaysFromBody(value) {
  const allowed = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const source = Array.isArray(value) ? value : clean(value).split(",");
  const days = source.map((item) => clean(item).toLowerCase()).filter((item) => allowed.includes(item));
  return days.length ? [...new Set(days)] : ["mon", "tue", "wed", "thu", "fri", "sat"];
}

function defaultPayload(user) {
  return {
    instituteName: user.instituteName || "NAXORA Institute",
    ownerName: user.name || "",
    ownerEmail: user.email || "",
    workingDays: ["mon", "tue", "wed", "thu", "fri", "sat"],
    createdBy: user._id,
  };
}

function buildPayload(body, user) {
  return {
    instituteName: clean(body.instituteName) || user.instituteName || "NAXORA Institute",
    legalName: clean(body.legalName),
    tagline: clean(body.tagline) || "AI-powered coaching management",
    logoUrl: clean(body.logoUrl),
    brandColor: clean(body.brandColor) || "#D4AF37",
    accentColor: clean(body.accentColor) || "#00D4FF",
    themeMode: enumValue(body.themeMode, ["dark", "light", "system"], "dark"),

    ownerName: clean(body.ownerName) || user.name || "",
    ownerPhone: clean(body.ownerPhone),
    ownerEmail: clean(body.ownerEmail).toLowerCase() || user.email || "",
    supportPhone: clean(body.supportPhone),
    supportEmail: clean(body.supportEmail).toLowerCase(),
    websiteUrl: clean(body.websiteUrl),

    addressLine1: clean(body.addressLine1),
    addressLine2: clean(body.addressLine2),
    city: clean(body.city),
    district: clean(body.district),
    state: clean(body.state) || "Haryana",
    pinCode: clean(body.pinCode),

    academicYearName: clean(body.academicYearName) || "2026-27",
    academicStartDate: dateOrNull(body.academicStartDate),
    academicEndDate: dateOrNull(body.academicEndDate),
    workingDays: workingDaysFromBody(body.workingDays),
    openingTime: clean(body.openingTime) || "08:00",
    closingTime: clean(body.closingTime) || "20:00",

    receiptPrefix: clean(body.receiptPrefix) || "NXR-RCPT",
    receiptFooter: clean(body.receiptFooter) || "Thank you for choosing NAXORA Institute.",
    invoiceNote: clean(body.invoiceNote) || "Fees once paid are subject to institute policy.",
    taxEnabled: boolValue(body.taxEnabled),
    taxName: clean(body.taxName) || "GST",
    taxPercent: numberValue(body.taxPercent, 0, 0, 100),

    certificatePrefix: clean(body.certificatePrefix) || "NXR-CERT",
    certificateAuthority: clean(body.certificateAuthority) || "Director",
    certificateSignatureUrl: clean(body.certificateSignatureUrl),
    certificateSealUrl: clean(body.certificateSealUrl),

    defaultAttendanceRule: enumValue(body.defaultAttendanceRule, ["strict", "normal", "flexible"], "normal"),
    minimumAttendancePercent: numberValue(body.minimumAttendancePercent, 75, 0, 100),
    feeDueDay: numberValue(body.feeDueDay, 10, 1, 31),
    lateFeeEnabled: boolValue(body.lateFeeEnabled),
    lateFeeAmount: numberValue(body.lateFeeAmount, 0, 0),

    studentIdPrefix: clean(body.studentIdPrefix) || "NXR-STU",
    teacherIdPrefix: clean(body.teacherIdPrefix) || "NXR-TCH",
    branchCodePrefix: clean(body.branchCodePrefix) || "NXR-BR",

    whatsappEnabled: boolValue(body.whatsappEnabled),
    emailEnabled: boolValue(body.emailEnabled),
    smsEnabled: boolValue(body.smsEnabled),
    autoBackupEnabled: boolValue(body.autoBackupEnabled),

    notes: clean(body.notes),
    createdBy: user._id,
  };
}

function validate(payload) {
  if (!payload.instituteName) return "Institute name required hai";
  if (payload.academicStartDate && payload.academicEndDate && payload.academicStartDate > payload.academicEndDate) return "Academic end date start date se baad honi chahiye";
  if (payload.lateFeeEnabled && payload.lateFeeAmount <= 0) return "Late fee enabled hai to late fee amount bhi add karo";
  return "";
}

function toResponse(settings) {
  return {
    id: settings._id,
    instituteName: settings.instituteName,
    legalName: settings.legalName,
    tagline: settings.tagline,
    logoUrl: settings.logoUrl,
    brandColor: settings.brandColor,
    accentColor: settings.accentColor,
    themeMode: settings.themeMode,
    ownerName: settings.ownerName,
    ownerPhone: settings.ownerPhone,
    ownerEmail: settings.ownerEmail,
    supportPhone: settings.supportPhone,
    supportEmail: settings.supportEmail,
    websiteUrl: settings.websiteUrl,
    addressLine1: settings.addressLine1,
    addressLine2: settings.addressLine2,
    city: settings.city,
    district: settings.district,
    state: settings.state,
    pinCode: settings.pinCode,
    academicYearName: settings.academicYearName,
    academicStartDate: settings.academicStartDate,
    academicEndDate: settings.academicEndDate,
    workingDays: settings.workingDays || [],
    openingTime: settings.openingTime,
    closingTime: settings.closingTime,
    receiptPrefix: settings.receiptPrefix,
    receiptFooter: settings.receiptFooter,
    invoiceNote: settings.invoiceNote,
    taxEnabled: settings.taxEnabled,
    taxName: settings.taxName,
    taxPercent: settings.taxPercent,
    certificatePrefix: settings.certificatePrefix,
    certificateAuthority: settings.certificateAuthority,
    certificateSignatureUrl: settings.certificateSignatureUrl,
    certificateSealUrl: settings.certificateSealUrl,
    defaultAttendanceRule: settings.defaultAttendanceRule,
    minimumAttendancePercent: settings.minimumAttendancePercent,
    feeDueDay: settings.feeDueDay,
    lateFeeEnabled: settings.lateFeeEnabled,
    lateFeeAmount: settings.lateFeeAmount,
    studentIdPrefix: settings.studentIdPrefix,
    teacherIdPrefix: settings.teacherIdPrefix,
    branchCodePrefix: settings.branchCodePrefix,
    whatsappEnabled: settings.whatsappEnabled,
    emailEnabled: settings.emailEnabled,
    smsEnabled: settings.smsEnabled,
    autoBackupEnabled: settings.autoBackupEnabled,
    notes: settings.notes,
    updatedAt: settings.updatedAt,
    createdAt: settings.createdAt,
  };
}

function buildPreview(settings) {
  const address = [settings.addressLine1, settings.addressLine2, settings.city, settings.district, settings.state, settings.pinCode].filter(Boolean).join(", ");
  return {
    brandLine: `${settings.instituteName} • ${settings.tagline || "AI-powered coaching"}`,
    receiptSampleNo: `${settings.receiptPrefix || "NXR-RCPT"}-0001`,
    certificateSampleNo: `${settings.certificatePrefix || "NXR-CERT"}-0001`,
    studentSampleId: `${settings.studentIdPrefix || "NXR-STU"}-001`,
    teacherSampleId: `${settings.teacherIdPrefix || "NXR-TCH"}-001`,
    branchSampleCode: `${settings.branchCodePrefix || "NXR-BR"}-01`,
    fullAddress: address || "Address not set",
    workingDaysText: (settings.workingDays || []).join(", ").toUpperCase(),
    timings: `${settings.openingTime || "08:00"} - ${settings.closingTime || "20:00"}`,
  };
}

export async function getSettings(req, res, next) {
  try {
    let settings = await InstituteSettings.findOne({ createdBy: req.user._id });
    if (!settings) settings = await InstituteSettings.create(defaultPayload(req.user));
    res.json({ success: true, settings: toResponse(settings), preview: buildPreview(settings) });
  } catch (error) { next(error); }
}

export async function updateSettings(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validate(payload);
    if (error) return res.status(400).json({ success: false, message: error });
    const settings = await InstituteSettings.findOneAndUpdate(
      { createdBy: req.user._id },
      payload,
      { new: true, runValidators: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, message: "Institute settings save ho gayi", settings: toResponse(settings), preview: buildPreview(settings) });
  } catch (error) { next(error); }
}

export async function updateBranding(req, res, next) {
  try {
    const update = {
      instituteName: clean(req.body.instituteName) || "NAXORA Institute",
      tagline: clean(req.body.tagline) || "AI-powered coaching management",
      logoUrl: clean(req.body.logoUrl),
      brandColor: clean(req.body.brandColor) || "#D4AF37",
      accentColor: clean(req.body.accentColor) || "#00D4FF",
      themeMode: enumValue(req.body.themeMode, ["dark", "light", "system"], "dark"),
    };
    const settings = await InstituteSettings.findOneAndUpdate(
      { createdBy: req.user._id },
      { $set: update, $setOnInsert: { createdBy: req.user._id } },
      { new: true, runValidators: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, message: "Brand settings update ho gayi", settings: toResponse(settings), preview: buildPreview(settings) });
  } catch (error) { next(error); }
}

export async function resetSettings(req, res, next) {
  try {
    await InstituteSettings.findOneAndDelete({ createdBy: req.user._id });
    const settings = await InstituteSettings.create(defaultPayload(req.user));
    res.json({ success: true, message: "Settings default par reset ho gayi", settings: toResponse(settings), preview: buildPreview(settings) });
  } catch (error) { next(error); }
}
