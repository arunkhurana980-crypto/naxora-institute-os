import OnlineBatchAccess from "../models/OnlineBatchAccess.js";
import BatchEnrollment from "../models/BatchEnrollment.js";

function clean(value = "") { return String(value || "").trim(); }
function enumValue(value, allowed, fallback) { return allowed.includes(value) ? value : fallback; }
function numberValue(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
function csv(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).slice(0, 20);
  return clean(value).split(",").map(clean).filter(Boolean).slice(0, 20);
}
function ownerFilter(user) { return { createdBy: user._id }; }
function safeDate(value, fallback = new Date()) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function batchPayload(body, user) {
  const accessDurationDays = numberValue(body.accessDurationDays, 30, 1, 3650);
  return {
    batchName: clean(body.batchName),
    courseName: clean(body.courseName),
    subject: clean(body.subject),
    description: clean(body.description),
    teacherName: clean(body.teacherName) || user.name || "NAXORA Teacher",
    mode: enumValue(body.mode, ["online", "hybrid", "offline_plus_online"], "online"),
    feeAmount: numberValue(body.feeAmount, 999, 0, 999999),
    billingCycle: enumValue(body.billingCycle, ["one_time", "monthly", "quarterly", "yearly"], "monthly"),
    currency: clean(body.currency) || "INR",
    accessDurationDays,
    startDate: safeDate(body.startDate, new Date()),
    endDate: safeDate(body.endDate, new Date(Date.now() + accessDurationDays * 24 * 60 * 60 * 1000)),
    maxStudents: numberValue(body.maxStudents, 100, 1, 50000),
    enrolledStudents: numberValue(body.enrolledStudents, 0, 0, 50000),
    status: enumValue(body.status, ["draft", "open", "full", "closed", "archived"], "open"),
    liveClassAccess: body.liveClassAccess !== false,
    commentsAccess: body.commentsAccess !== false,
    recordingAccess: body.recordingAccess !== false,
    notesAccess: body.notesAccess !== false,
    certificateAccess: body.certificateAccess === true,
    paymentRequired: body.paymentRequired !== false,
    paymentMode: enumValue(body.paymentMode, ["cash", "upi", "bank", "razorpay", "card", "other"], "razorpay"),
    publicVisible: body.publicVisible !== false,
    tags: csv(body.tags),
    createdBy: user._id,
  };
}
function validateBatch(payload) {
  if (!payload.batchName) return "Batch name required hai";
  if (!payload.courseName) return "Course name required hai";
  if (!payload.teacherName) return "Teacher name required hai";
  if (payload.enrolledStudents > payload.maxStudents) return "Enrolled students max students se zyada nahi ho sakte";
  return "";
}
function batchResponse(item) {
  return {
    id: item._id,
    batchName: item.batchName,
    courseName: item.courseName,
    subject: item.subject,
    description: item.description,
    teacherName: item.teacherName,
    mode: item.mode,
    feeAmount: item.feeAmount,
    billingCycle: item.billingCycle,
    currency: item.currency,
    accessDurationDays: item.accessDurationDays,
    startDate: item.startDate,
    endDate: item.endDate,
    maxStudents: item.maxStudents,
    enrolledStudents: item.enrolledStudents,
    seatsLeft: Math.max(0, (item.maxStudents || 0) - (item.enrolledStudents || 0)),
    status: item.status,
    liveClassAccess: item.liveClassAccess,
    commentsAccess: item.commentsAccess,
    recordingAccess: item.recordingAccess,
    notesAccess: item.notesAccess,
    certificateAccess: item.certificateAccess,
    paymentRequired: item.paymentRequired,
    paymentMode: item.paymentMode,
    publicVisible: item.publicVisible,
    tags: item.tags || [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
function enrollmentPayload(body, batch, user) {
  const paidAmount = numberValue(body.paidAmount, 0, 0, 999999);
  const dueAmount = Math.max(0, numberValue(body.dueAmount, batch.feeAmount - paidAmount, 0, 999999));
  const feeStatus = enumValue(body.feeStatus, ["pending", "partial", "paid", "refunded", "expired"], paidAmount >= batch.feeAmount ? "paid" : paidAmount > 0 ? "partial" : "pending");
  const accessStatus = enumValue(body.accessStatus, ["pending", "active", "blocked", "expired", "completed"], feeStatus === "paid" ? "active" : "pending");
  const startsAt = safeDate(body.accessStartsAt, new Date());
  const expiresAt = safeDate(body.accessExpiresAt, new Date(startsAt.getTime() + (batch.accessDurationDays || 30) * 24 * 60 * 60 * 1000));
  return {
    onlineBatch: batch._id,
    studentName: clean(body.studentName),
    studentEmail: clean(body.studentEmail).toLowerCase(),
    studentPhone: clean(body.studentPhone),
    parentPhone: clean(body.parentPhone),
    feeStatus,
    paidAmount,
    dueAmount,
    accessStatus,
    joinedAt: safeDate(body.joinedAt, new Date()),
    accessStartsAt: startsAt,
    accessExpiresAt: expiresAt,
    paymentReference: clean(body.paymentReference),
    source: enumValue(body.source, ["manual", "discovery", "website", "whatsapp", "youtube", "instagram", "other"], "manual"),
    notes: clean(body.notes),
    createdBy: user._id,
  };
}
function validateEnrollment(payload) {
  if (!payload.studentName) return "Student name required hai";
  if (!payload.studentPhone) return "Student phone required hai";
  return "";
}
function enrollmentResponse(item) {
  return {
    id: item._id,
    onlineBatch: item.onlineBatch,
    studentName: item.studentName,
    studentEmail: item.studentEmail,
    studentPhone: item.studentPhone,
    parentPhone: item.parentPhone,
    feeStatus: item.feeStatus,
    paidAmount: item.paidAmount,
    dueAmount: item.dueAmount,
    accessStatus: item.accessStatus,
    joinedAt: item.joinedAt,
    accessStartsAt: item.accessStartsAt,
    accessExpiresAt: item.accessExpiresAt,
    paymentReference: item.paymentReference,
    source: item.source,
    notes: item.notes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
async function summary(user) {
  const filter = ownerFilter(user);
  const [totalBatches, openBatches, totalEnrollments, activeAccess, pendingFees, revenue] = await Promise.all([
    OnlineBatchAccess.countDocuments(filter),
    OnlineBatchAccess.countDocuments({ ...filter, status: "open" }),
    BatchEnrollment.countDocuments(filter),
    BatchEnrollment.countDocuments({ ...filter, accessStatus: "active" }),
    BatchEnrollment.countDocuments({ ...filter, feeStatus: { $in: ["pending", "partial"] } }),
    BatchEnrollment.aggregate([{ $match: { createdBy: user._id } }, { $group: { _id: null, total: { $sum: "$paidAmount" } } }]),
  ]);
  return { totalBatches, openBatches, totalEnrollments, activeAccess, pendingFees, revenue: revenue[0]?.total || 0 };
}

export async function onlineBatchStatus(req, res) {
  res.json({
    success: true,
    part: "Part 40 - Online Batch Access Management",
    concept: "Student live class tabhi join kare jab institute ke online batch ka access active ho. Batch fee, enrollment, access expiry aur payment status yahin manage hoga.",
    protectedRoutes: [
      "GET/POST /api/online-batches",
      "GET/POST /api/online-batches/:id/enrollments",
      "PATCH /api/online-batches/:id/enrollments/:enrollmentId/status",
      "POST /api/online-batches/:id/check-access"
    ],
    frontendFiles: ["frontend/online-batches.html", "frontend/online-batches.css", "frontend/online-batches.js"],
    nextRoadmap: "Premium SaaS Landing Page ab Part 41 se start hoga.",
  });
}

export async function getPublicOnlineBatches(req, res, next) {
  try {
    const { search = "", course = "", mode = "" } = req.query;
    const filter = { publicVisible: true, status: "open" };
    if (course.trim()) filter.courseName = new RegExp(course.trim(), "i");
    if (mode.trim()) filter.mode = mode.trim();
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ batchName: regex }, { courseName: regex }, { subject: regex }, { teacherName: regex }];
    }
    const items = await OnlineBatchAccess.find(filter).sort({ updatedAt: -1 }).limit(100);
    res.json({ success: true, batches: items.map(batchResponse) });
  } catch (error) { next(error); }
}

export async function getOnlineBatches(req, res, next) {
  try {
    const { status = "", search = "" } = req.query;
    const filter = ownerFilter(req.user);
    if (status.trim()) filter.status = status.trim();
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ batchName: regex }, { courseName: regex }, { subject: regex }, { teacherName: regex }];
    }
    const [items, stats] = await Promise.all([
      OnlineBatchAccess.find(filter).sort({ updatedAt: -1 }).limit(200),
      summary(req.user),
    ]);
    res.json({ success: true, ...stats, batches: items.map(batchResponse) });
  } catch (error) { next(error); }
}

export async function createOnlineBatch(req, res, next) {
  try {
    const payload = batchPayload(req.body, req.user);
    const error = validateBatch(payload);
    if (error) return res.status(400).json({ success: false, message: error });
    const item = await OnlineBatchAccess.create(payload);
    res.status(201).json({ success: true, message: "Online batch access plan save ho gaya", batch: batchResponse(item) });
  } catch (error) { next(error); }
}

export async function getOnlineBatchById(req, res, next) {
  try {
    const item = await OnlineBatchAccess.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: "Online batch nahi mila" });
    res.json({ success: true, batch: batchResponse(item) });
  } catch (error) { next(error); }
}

export async function updateOnlineBatch(req, res, next) {
  try {
    const payload = batchPayload(req.body, req.user);
    delete payload.createdBy;
    const error = validateBatch({ ...payload, createdBy: req.user._id });
    if (error) return res.status(400).json({ success: false, message: error });
    const item = await OnlineBatchAccess.findOneAndUpdate({ _id: req.params.id, createdBy: req.user._id }, payload, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: "Online batch nahi mila" });
    res.json({ success: true, message: "Online batch update ho gaya", batch: batchResponse(item) });
  } catch (error) { next(error); }
}

export async function updateOnlineBatchStatus(req, res, next) {
  try {
    const status = enumValue(req.body.status, ["draft", "open", "full", "closed", "archived"], "open");
    const item = await OnlineBatchAccess.findOneAndUpdate({ _id: req.params.id, createdBy: req.user._id }, { status }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: "Online batch nahi mila" });
    res.json({ success: true, message: `Online batch status ${status} ho gaya`, batch: batchResponse(item) });
  } catch (error) { next(error); }
}

export async function deleteOnlineBatch(req, res, next) {
  try {
    const item = await OnlineBatchAccess.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: "Online batch nahi mila" });
    await BatchEnrollment.deleteMany({ onlineBatch: item._id, createdBy: req.user._id });
    res.json({ success: true, message: "Online batch delete ho gaya" });
  } catch (error) { next(error); }
}

export async function getEnrollments(req, res, next) {
  try {
    const batch = await OnlineBatchAccess.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!batch) return res.status(404).json({ success: false, message: "Online batch nahi mila" });
    const enrollments = await BatchEnrollment.find({ onlineBatch: batch._id, createdBy: req.user._id }).sort({ updatedAt: -1 }).limit(300);
    res.json({ success: true, batch: batchResponse(batch), enrollments: enrollments.map(enrollmentResponse) });
  } catch (error) { next(error); }
}

export async function createEnrollment(req, res, next) {
  try {
    const batch = await OnlineBatchAccess.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!batch) return res.status(404).json({ success: false, message: "Online batch nahi mila" });
    if (batch.status !== "open") return res.status(400).json({ success: false, message: "Ye batch open nahi hai" });
    if ((batch.enrolledStudents || 0) >= (batch.maxStudents || 0)) return res.status(400).json({ success: false, message: "Batch full ho chuka hai" });
    const payload = enrollmentPayload(req.body, batch, req.user);
    const error = validateEnrollment(payload);
    if (error) return res.status(400).json({ success: false, message: error });
    const item = await BatchEnrollment.create(payload);
    await OnlineBatchAccess.updateOne({ _id: batch._id }, { $inc: { enrolledStudents: 1 } });
    res.status(201).json({ success: true, message: payload.accessStatus === "active" ? "Student ko live batch access mil gaya" : "Enrollment save ho gaya, payment ke baad access active hoga", enrollment: enrollmentResponse(item) });
  } catch (error) { next(error); }
}

export async function updateEnrollmentStatus(req, res, next) {
  try {
    const batch = await OnlineBatchAccess.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!batch) return res.status(404).json({ success: false, message: "Online batch nahi mila" });
    const feeStatus = enumValue(req.body.feeStatus, ["pending", "partial", "paid", "refunded", "expired"], "paid");
    const accessStatus = enumValue(req.body.accessStatus, ["pending", "active", "blocked", "expired", "completed"], feeStatus === "paid" ? "active" : "pending");
    const update = { feeStatus, accessStatus };
    if (req.body.paidAmount !== undefined) update.paidAmount = numberValue(req.body.paidAmount, 0, 0, 999999);
    if (req.body.dueAmount !== undefined) update.dueAmount = numberValue(req.body.dueAmount, 0, 0, 999999);
    if (req.body.paymentReference !== undefined) update.paymentReference = clean(req.body.paymentReference);
    const item = await BatchEnrollment.findOneAndUpdate({ _id: req.params.enrollmentId, onlineBatch: batch._id, createdBy: req.user._id }, update, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: "Enrollment nahi mila" });
    res.json({ success: true, message: "Enrollment access/payment status update ho gaya", enrollment: enrollmentResponse(item) });
  } catch (error) { next(error); }
}

export async function checkBatchAccess(req, res, next) {
  try {
    const batch = await OnlineBatchAccess.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!batch) return res.status(404).json({ success: false, message: "Online batch nahi mila" });
    const phone = clean(req.body.studentPhone);
    const email = clean(req.body.studentEmail).toLowerCase();
    const query = { onlineBatch: batch._id, createdBy: req.user._id };
    if (phone) query.studentPhone = phone;
    else if (email) query.studentEmail = email;
    else return res.status(400).json({ success: false, message: "Student phone ya email required hai" });
    const enrollment = await BatchEnrollment.findOne(query).sort({ updatedAt: -1 });
    const now = new Date();
    const allowed = Boolean(enrollment && enrollment.accessStatus === "active" && enrollment.feeStatus === "paid" && new Date(enrollment.accessExpiresAt) >= now);
    res.json({
      success: true,
      allowed,
      message: allowed ? "Access allowed: student live class join kar sakta hai" : "Access blocked: batch payment/access active nahi hai",
      batch: batchResponse(batch),
      enrollment: enrollment ? enrollmentResponse(enrollment) : null,
    });
  } catch (error) { next(error); }
}
