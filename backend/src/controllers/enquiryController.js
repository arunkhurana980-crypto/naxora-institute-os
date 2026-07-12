import AdmissionEnquiry from "../models/AdmissionEnquiry.js";

function clean(value = "") {
  return String(value || "").trim();
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function dateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const sources = ["youtube", "instagram", "facebook", "friend", "walk_in", "whatsapp", "poster", "school", "website", "other"];
const temperatures = ["hot", "warm", "cold"];
const statuses = ["new", "contacted", "demo_booked", "follow_up", "converted", "rejected", "lost"];
const followModes = ["call", "whatsapp", "visit", "demo", "email", "other"];
const outcomes = ["interested", "not_interested", "callback", "demo_booked", "converted", "no_response"];

function buildPayload(body, user) {
  return {
    studentName: clean(body.studentName),
    parentName: clean(body.parentName),
    phone: clean(body.phone),
    alternatePhone: clean(body.alternatePhone),
    email: clean(body.email).toLowerCase(),
    classLevel: clean(body.classLevel),
    interestedCourse: clean(body.interestedCourse),
    preferredBatch: clean(body.preferredBatch),
    leadSource: enumValue(body.leadSource, sources, "youtube"),
    leadTemperature: enumValue(body.leadTemperature, temperatures, "warm"),
    status: enumValue(body.status, statuses, "new"),
    counsellorName: clean(body.counsellorName),
    expectedFee: numberValue(body.expectedFee),
    offeredDiscount: numberValue(body.offeredDiscount),
    demoDate: dateOrNull(body.demoDate),
    nextFollowUpDate: dateOrNull(body.nextFollowUpDate),
    city: clean(body.city),
    address: clean(body.address),
    notes: clean(body.notes),
    instituteName: user.instituteName || "NAXORA Institute",
    createdBy: user._id,
  };
}

function validatePayload(payload) {
  if (!payload.studentName) return "Student name required hai";
  if (!payload.phone) return "Phone number required hai";
  if (!payload.interestedCourse) return "Interested course required hai";
  if (payload.offeredDiscount > payload.expectedFee && payload.expectedFee > 0) return "Discount expected fee se zyada nahi ho sakta";
  return "";
}

function followUpToResponse(record) {
  return {
    id: record._id,
    date: record.date,
    mode: record.mode,
    note: record.note,
    outcome: record.outcome,
    nextFollowUpDate: record.nextFollowUpDate,
    createdAt: record.createdAt,
  };
}

function toResponse(enquiry) {
  const expectedFee = Number(enquiry.expectedFee || 0);
  const offeredDiscount = Number(enquiry.offeredDiscount || 0);
  const finalFee = Math.max(expectedFee - offeredDiscount, 0);
  return {
    id: enquiry._id,
    studentName: enquiry.studentName,
    parentName: enquiry.parentName,
    phone: enquiry.phone,
    alternatePhone: enquiry.alternatePhone,
    email: enquiry.email,
    classLevel: enquiry.classLevel,
    interestedCourse: enquiry.interestedCourse,
    preferredBatch: enquiry.preferredBatch,
    leadSource: enquiry.leadSource,
    leadTemperature: enquiry.leadTemperature,
    status: enquiry.status,
    counsellorName: enquiry.counsellorName,
    expectedFee,
    offeredDiscount,
    finalFee,
    demoDate: enquiry.demoDate,
    nextFollowUpDate: enquiry.nextFollowUpDate,
    city: enquiry.city,
    address: enquiry.address,
    notes: enquiry.notes,
    followUps: (enquiry.followUps || []).map(followUpToResponse),
    followUpCount: enquiry.followUps?.length || 0,
    instituteName: enquiry.instituteName,
    createdAt: enquiry.createdAt,
    updatedAt: enquiry.updatedAt,
  };
}

async function buildSummary(ownerFilter) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const [
    total,
    hot,
    warm,
    cold,
    newCount,
    contacted,
    demoBooked,
    followUp,
    converted,
    rejectedOrLost,
    dueFollowUps,
    feeAgg,
  ] = await Promise.all([
    AdmissionEnquiry.countDocuments(ownerFilter),
    AdmissionEnquiry.countDocuments({ ...ownerFilter, leadTemperature: "hot" }),
    AdmissionEnquiry.countDocuments({ ...ownerFilter, leadTemperature: "warm" }),
    AdmissionEnquiry.countDocuments({ ...ownerFilter, leadTemperature: "cold" }),
    AdmissionEnquiry.countDocuments({ ...ownerFilter, status: "new" }),
    AdmissionEnquiry.countDocuments({ ...ownerFilter, status: "contacted" }),
    AdmissionEnquiry.countDocuments({ ...ownerFilter, status: "demo_booked" }),
    AdmissionEnquiry.countDocuments({ ...ownerFilter, status: "follow_up" }),
    AdmissionEnquiry.countDocuments({ ...ownerFilter, status: "converted" }),
    AdmissionEnquiry.countDocuments({ ...ownerFilter, status: { $in: ["rejected", "lost"] } }),
    AdmissionEnquiry.countDocuments({ ...ownerFilter, status: { $nin: ["converted", "rejected", "lost"] }, nextFollowUpDate: { $lte: today } }),
    AdmissionEnquiry.aggregate([
      { $match: ownerFilter },
      { $group: { _id: null, expected: { $sum: "$expectedFee" }, discount: { $sum: "$offeredDiscount" } } },
    ]),
  ]);

  const expectedFee = feeAgg[0]?.expected || 0;
  const offeredDiscount = feeAgg[0]?.discount || 0;
  return {
    totalEnquiries: total,
    hotLeads: hot,
    warmLeads: warm,
    coldLeads: cold,
    newEnquiries: newCount,
    contactedEnquiries: contacted,
    demoBooked,
    followUpLeads: followUp,
    convertedLeads: converted,
    rejectedOrLost,
    dueFollowUps,
    expectedRevenue: expectedFee,
    expectedFinalRevenue: Math.max(expectedFee - offeredDiscount, 0),
    conversionPercent: total ? Math.round((converted / total) * 100) : 0,
  };
}

export async function createEnquiry(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const enquiry = await AdmissionEnquiry.create(payload);
    res.status(201).json({ success: true, message: "Admission enquiry save ho gayi", enquiry: toResponse(enquiry) });
  } catch (error) {
    next(error);
  }
}

export async function getEnquiries(req, res, next) {
  try {
    const { search = "", status = "", leadTemperature = "", leadSource = "", course = "" } = req.query;
    const ownerFilter = { createdBy: req.user._id };
    const filter = { ...ownerFilter };

    if (status.trim()) filter.status = status.trim();
    if (leadTemperature.trim()) filter.leadTemperature = leadTemperature.trim();
    if (leadSource.trim()) filter.leadSource = leadSource.trim();
    if (course.trim()) filter.interestedCourse = new RegExp(course.trim(), "i");

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { studentName: regex },
        { parentName: regex },
        { phone: regex },
        { email: regex },
        { interestedCourse: regex },
        { city: regex },
        { counsellorName: regex },
      ];
    }

    const [enquiries, summary] = await Promise.all([
      AdmissionEnquiry.find(filter).sort({ createdAt: -1 }).limit(300),
      buildSummary(ownerFilter),
    ]);

    res.json({ success: true, ...summary, enquiries: enquiries.map(toResponse) });
  } catch (error) {
    next(error);
  }
}

export async function getEnquiryById(req, res, next) {
  try {
    const enquiry = await AdmissionEnquiry.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!enquiry) return res.status(404).json({ success: false, message: "Enquiry nahi mili" });
    res.json({ success: true, enquiry: toResponse(enquiry) });
  } catch (error) {
    next(error);
  }
}

export async function updateEnquiry(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const enquiry = await AdmissionEnquiry.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );

    if (!enquiry) return res.status(404).json({ success: false, message: "Enquiry nahi mili" });
    res.json({ success: true, message: "Admission enquiry update ho gayi", enquiry: toResponse(enquiry) });
  } catch (error) {
    next(error);
  }
}

export async function updateEnquiryStatus(req, res, next) {
  try {
    const status = enumValue(req.body.status, statuses, "follow_up");
    const enquiry = await AdmissionEnquiry.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status },
      { new: true, runValidators: true }
    );

    if (!enquiry) return res.status(404).json({ success: false, message: "Enquiry nahi mili" });
    res.json({ success: true, message: "Enquiry status update ho gaya", enquiry: toResponse(enquiry) });
  } catch (error) {
    next(error);
  }
}

export async function addFollowUp(req, res, next) {
  try {
    const nextFollowUpDate = dateOrNull(req.body.nextFollowUpDate);
    const followUp = {
      date: dateOrNull(req.body.date) || new Date(),
      mode: enumValue(req.body.mode, followModes, "call"),
      note: clean(req.body.note),
      outcome: enumValue(req.body.outcome, outcomes, "callback"),
      nextFollowUpDate,
    };

    const statusFromOutcome = {
      interested: "follow_up",
      not_interested: "lost",
      callback: "follow_up",
      demo_booked: "demo_booked",
      converted: "converted",
      no_response: "follow_up",
    };

    const enquiry = await AdmissionEnquiry.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { $push: { followUps: followUp }, status: statusFromOutcome[followUp.outcome] || "follow_up", nextFollowUpDate },
      { new: true, runValidators: true }
    );

    if (!enquiry) return res.status(404).json({ success: false, message: "Enquiry nahi mili" });
    res.json({ success: true, message: "Follow-up note add ho gaya", enquiry: toResponse(enquiry) });
  } catch (error) {
    next(error);
  }
}

export async function deleteEnquiry(req, res, next) {
  try {
    const enquiry = await AdmissionEnquiry.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!enquiry) return res.status(404).json({ success: false, message: "Enquiry nahi mili" });
    res.json({ success: true, message: "Admission enquiry delete ho gayi" });
  } catch (error) {
    next(error);
  }
}
