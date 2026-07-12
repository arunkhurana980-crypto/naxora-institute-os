import AdmissionEnquiry from "../models/AdmissionEnquiry.js";

function clean(value = "") {
  return String(value || "").trim();
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function dateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function addDays(days) {
  const date = startOfToday();
  date.setDate(date.getDate() + Number(days || 0));
  return date;
}

const terminalStatuses = ["converted", "rejected", "lost"];
const activeStatuses = ["new", "contacted", "demo_booked", "follow_up"];
const followModes = ["call", "whatsapp", "visit", "demo", "email", "other"];
const outcomes = ["interested", "not_interested", "callback", "demo_booked", "converted", "no_response"];
const enquiryStatuses = ["new", "contacted", "demo_booked", "follow_up", "converted", "rejected", "lost"];
const temperatures = ["hot", "warm", "cold"];

function latestFollowUp(enquiry) {
  const list = enquiry.followUps || [];
  return list.length ? list[list.length - 1] : null;
}

function daysFromToday(value) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const today = startOfToday();
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function urgency(enquiry) {
  const diff = daysFromToday(enquiry.nextFollowUpDate);
  if (terminalStatuses.includes(enquiry.status)) return "closed";
  if (diff === null) return enquiry.leadTemperature === "hot" ? "needs_schedule" : "normal";
  if (diff < 0) return "missed";
  if (diff === 0) return "today";
  if (diff <= 2) return "upcoming";
  return "scheduled";
}

function toLead(enquiry) {
  const last = latestFollowUp(enquiry);
  const expectedFee = Number(enquiry.expectedFee || 0);
  const discount = Number(enquiry.offeredDiscount || 0);
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
    offeredDiscount: discount,
    finalFee: Math.max(expectedFee - discount, 0),
    city: enquiry.city,
    demoDate: enquiry.demoDate,
    nextFollowUpDate: enquiry.nextFollowUpDate,
    notes: enquiry.notes,
    urgency: urgency(enquiry),
    daysLeft: daysFromToday(enquiry.nextFollowUpDate),
    followUpCount: enquiry.followUps?.length || 0,
    lastFollowUp: last ? {
      date: last.date,
      mode: last.mode,
      note: last.note,
      outcome: last.outcome,
      nextFollowUpDate: last.nextFollowUpDate,
    } : null,
    createdAt: enquiry.createdAt,
    updatedAt: enquiry.updatedAt,
  };
}

function performanceFromEnquiries(enquiries) {
  const map = new Map();
  for (const enquiry of enquiries) {
    const counsellor = enquiry.counsellorName || "Unassigned";
    if (!map.has(counsellor)) {
      map.set(counsellor, { counsellorName: counsellor, totalLeads: 0, hotLeads: 0, converted: 0, followUpsDone: 0, dueToday: 0, missed: 0, pipelineValue: 0 });
    }
    const item = map.get(counsellor);
    item.totalLeads += 1;
    item.followUpsDone += enquiry.followUps?.length || 0;
    if (enquiry.leadTemperature === "hot") item.hotLeads += 1;
    if (enquiry.status === "converted") item.converted += 1;
    if (urgency(enquiry) === "today") item.dueToday += 1;
    if (urgency(enquiry) === "missed") item.missed += 1;
    if (!terminalStatuses.includes(enquiry.status)) item.pipelineValue += Math.max(Number(enquiry.expectedFee || 0) - Number(enquiry.offeredDiscount || 0), 0);
  }

  return [...map.values()].map((item) => ({
    ...item,
    conversionPercent: item.totalLeads ? Math.round((item.converted / item.totalLeads) * 100) : 0,
  })).sort((a, b) => b.hotLeads - a.hotLeads || b.pipelineValue - a.pipelineValue);
}

async function summary(ownerFilter) {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const weekEnd = addDays(7);
  const [total, today, missed, upcoming, hot, converted, noSchedule, feeAgg] = await Promise.all([
    AdmissionEnquiry.countDocuments(ownerFilter),
    AdmissionEnquiry.countDocuments({ ...ownerFilter, status: { $nin: terminalStatuses }, nextFollowUpDate: { $gte: todayStart, $lte: todayEnd } }),
    AdmissionEnquiry.countDocuments({ ...ownerFilter, status: { $nin: terminalStatuses }, nextFollowUpDate: { $lt: todayStart } }),
    AdmissionEnquiry.countDocuments({ ...ownerFilter, status: { $nin: terminalStatuses }, nextFollowUpDate: { $gt: todayEnd, $lte: weekEnd } }),
    AdmissionEnquiry.countDocuments({ ...ownerFilter, status: { $nin: terminalStatuses }, leadTemperature: "hot" }),
    AdmissionEnquiry.countDocuments({ ...ownerFilter, status: "converted" }),
    AdmissionEnquiry.countDocuments({ ...ownerFilter, status: { $nin: terminalStatuses }, nextFollowUpDate: null }),
    AdmissionEnquiry.aggregate([
      { $match: { ...ownerFilter, status: { $nin: terminalStatuses } } },
      { $group: { _id: null, expected: { $sum: "$expectedFee" }, discount: { $sum: "$offeredDiscount" } } },
    ]),
  ]);

  const expected = feeAgg[0]?.expected || 0;
  const discount = feeAgg[0]?.discount || 0;
  return {
    totalLeads: total,
    todayFollowUps: today,
    missedFollowUps: missed,
    upcomingFollowUps: upcoming,
    hotLeadPriority: hot,
    convertedLeads: converted,
    unscheduledLeads: noSchedule,
    activePipelineValue: Math.max(expected - discount, 0),
    conversionPercent: total ? Math.round((converted / total) * 100) : 0,
  };
}

export async function getFollowupBoard(req, res, next) {
  try {
    const { search = "", counsellor = "", view = "all" } = req.query;
    const ownerFilter = { createdBy: req.user._id };
    const filter = { ...ownerFilter };

    if (counsellor.trim()) filter.counsellorName = new RegExp(counsellor.trim(), "i");
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { studentName: regex },
        { parentName: regex },
        { phone: regex },
        { interestedCourse: regex },
        { city: regex },
        { counsellorName: regex },
      ];
    }

    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    const weekEnd = addDays(7);
    if (view === "today") {
      filter.status = { $nin: terminalStatuses };
      filter.nextFollowUpDate = { $gte: todayStart, $lte: todayEnd };
    } else if (view === "missed") {
      filter.status = { $nin: terminalStatuses };
      filter.nextFollowUpDate = { $lt: todayStart };
    } else if (view === "upcoming") {
      filter.status = { $nin: terminalStatuses };
      filter.nextFollowUpDate = { $gt: todayEnd, $lte: weekEnd };
    } else if (view === "hot") {
      filter.status = { $nin: terminalStatuses };
      filter.leadTemperature = "hot";
    } else if (view === "converted") {
      filter.status = "converted";
    } else if (view === "unscheduled") {
      filter.status = { $nin: terminalStatuses };
      filter.nextFollowUpDate = null;
    } else if (view === "active") {
      filter.status = { $in: activeStatuses };
    }

    const [enquiries, boardSummary] = await Promise.all([
      AdmissionEnquiry.find(filter).sort({ leadTemperature: 1, nextFollowUpDate: 1, updatedAt: -1 }).limit(300),
      summary(ownerFilter),
    ]);

    const allForPerformance = await AdmissionEnquiry.find(ownerFilter).select("counsellorName leadTemperature status followUps nextFollowUpDate expectedFee offeredDiscount").limit(1000);

    res.json({
      success: true,
      ...boardSummary,
      performance: performanceFromEnquiries(allForPerformance),
      leads: enquiries.map(toLead),
    });
  } catch (error) {
    next(error);
  }
}

export async function addFollowupLog(req, res, next) {
  try {
    const nextFollowUpDate = dateOrNull(req.body.nextFollowUpDate);
    const outcome = enumValue(req.body.outcome, outcomes, "callback");
    const followUp = {
      date: dateOrNull(req.body.date) || new Date(),
      mode: enumValue(req.body.mode, followModes, "call"),
      note: clean(req.body.note),
      outcome,
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

    const update = {
      $push: { followUps: followUp },
      status: statusFromOutcome[outcome] || "follow_up",
      nextFollowUpDate,
    };

    if (outcome === "converted") update.leadTemperature = "hot";
    if (outcome === "not_interested") update.leadTemperature = "cold";

    const enquiry = await AdmissionEnquiry.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      update,
      { new: true, runValidators: true }
    );

    if (!enquiry) return res.status(404).json({ success: false, message: "Lead nahi mila" });
    res.json({ success: true, message: "Follow-up log save ho gaya", lead: toLead(enquiry) });
  } catch (error) {
    next(error);
  }
}

export async function snoozeFollowup(req, res, next) {
  try {
    const days = Number(req.body.days || 1);
    const safeDays = Number.isFinite(days) && days > 0 && days <= 90 ? days : 1;
    const nextFollowUpDate = addDays(safeDays);

    const enquiry = await AdmissionEnquiry.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { nextFollowUpDate, status: "follow_up" },
      { new: true, runValidators: true }
    );

    if (!enquiry) return res.status(404).json({ success: false, message: "Lead nahi mila" });
    res.json({ success: true, message: `${safeDays} din baad follow-up set ho gaya`, lead: toLead(enquiry) });
  } catch (error) {
    next(error);
  }
}

export async function updateFollowupLead(req, res, next) {
  try {
    const update = {};
    if (req.body.status) update.status = enumValue(req.body.status, enquiryStatuses, "follow_up");
    if (req.body.leadTemperature) update.leadTemperature = enumValue(req.body.leadTemperature, temperatures, "warm");
    if (req.body.counsellorName !== undefined) update.counsellorName = clean(req.body.counsellorName);
    if (req.body.nextFollowUpDate !== undefined) update.nextFollowUpDate = dateOrNull(req.body.nextFollowUpDate);

    const enquiry = await AdmissionEnquiry.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      update,
      { new: true, runValidators: true }
    );

    if (!enquiry) return res.status(404).json({ success: false, message: "Lead nahi mila" });
    res.json({ success: true, message: "Lead follow-up status update ho gaya", lead: toLead(enquiry) });
  } catch (error) {
    next(error);
  }
}
