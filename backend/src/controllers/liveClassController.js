import LiveClass from "../models/LiveClass.js";
import LiveClassComment from "../models/LiveClassComment.js";
import LiveClassSubscription from "../models/LiveClassSubscription.js";

const LIVE_PLANS = [
  { planName: "Live Starter", price: 999, billingCycle: "monthly", maxLiveClasses: 30, maxStudentsPerClass: 100, recordingHours: 10, features: ["30 live classes/month", "100 students/class", "Comments/chat", "Basic recordings"] },
  { planName: "Live Pro", price: 1999, billingCycle: "monthly", maxLiveClasses: 100, maxStudentsPerClass: 300, recordingHours: 50, features: ["100 live classes/month", "300 students/class", "Pinned comments", "Recording links", "Batch-wise live dashboard"] },
  { planName: "Live Premium", price: 2999, billingCycle: "monthly", maxLiveClasses: 300, maxStudentsPerClass: 800, recordingHours: 150, features: ["Premium live classes", "800 students/class", "Comments moderation", "Recording library", "Priority support"] },
  { planName: "Live Enterprise", price: 7999, billingCycle: "monthly", maxLiveClasses: 9999, maxStudentsPerClass: 5000, recordingHours: 1000, features: ["Unlimited live classes", "Large institute support", "Multi-branch live setup", "Custom support"] },
];

function clean(value = "") { return String(value || "").trim(); }
function enumValue(value, allowed, fallback) { return allowed.includes(value) ? value : fallback; }
function numberValue(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
function ownerFilter(user) { return { createdBy: user._id }; }
function csv(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).slice(0, 20);
  return clean(value).split(",").map(clean).filter(Boolean).slice(0, 20);
}
function liveClassPayload(body, user) {
  return {
    title: clean(body.title),
    subject: clean(body.subject),
    topic: clean(body.topic),
    batchName: clean(body.batchName),
    courseName: clean(body.courseName),
    teacherName: clean(body.teacherName) || user.name || "NAXORA Teacher",
    startAt: body.startAt ? new Date(body.startAt) : new Date(),
    durationMinutes: numberValue(body.durationMinutes, 60, 10, 600),
    platform: enumValue(body.platform, ["internal", "zoom", "google_meet", "youtube", "other"], "internal"),
    classUrl: clean(body.classUrl),
    recordingUrl: clean(body.recordingUrl),
    thumbnailUrl: clean(body.thumbnailUrl),
    description: clean(body.description),
    resources: csv(body.resources),
    status: enumValue(body.status, ["scheduled", "live", "completed", "cancelled"], "scheduled"),
    chatEnabled: body.chatEnabled !== false,
    commentsEnabled: body.commentsEnabled !== false,
    liveSubscriptionRequired: body.liveSubscriptionRequired !== false,
    maxStudents: numberValue(body.maxStudents, 100, 1, 10000),
    enrolledStudents: numberValue(body.enrolledStudents, 0, 0, 10000),
    createdBy: user._id,
  };
}
function validateLiveClass(payload) {
  if (!payload.title) return "Live class title required hai";
  if (!payload.subject) return "Subject required hai";
  if (!payload.batchName) return "Batch name required hai";
  if (!payload.teacherName) return "Teacher name required hai";
  if (Number.isNaN(payload.startAt.getTime())) return "Valid start date/time required hai";
  return "";
}
function classResponse(item) {
  return {
    id: item._id,
    title: item.title,
    subject: item.subject,
    topic: item.topic,
    batchName: item.batchName,
    courseName: item.courseName,
    teacherName: item.teacherName,
    startAt: item.startAt,
    durationMinutes: item.durationMinutes,
    platform: item.platform,
    classUrl: item.classUrl,
    recordingUrl: item.recordingUrl,
    thumbnailUrl: item.thumbnailUrl,
    description: item.description,
    resources: item.resources || [],
    status: item.status,
    chatEnabled: item.chatEnabled,
    commentsEnabled: item.commentsEnabled,
    liveSubscriptionRequired: item.liveSubscriptionRequired,
    maxStudents: item.maxStudents,
    enrolledStudents: item.enrolledStudents,
    totalComments: item.totalComments || 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
function commentResponse(item) {
  return {
    id: item._id,
    liveClass: item.liveClass,
    text: item.text,
    authorName: item.authorName,
    authorRole: item.authorRole,
    isPinned: item.isPinned,
    status: item.status,
    createdAt: item.createdAt,
  };
}
function subscriptionPayload(body, user) {
  const plan = LIVE_PLANS.find(p => p.planName === body.planName) || LIVE_PLANS[0];
  return {
    instituteName: clean(body.instituteName) || user.instituteName || user.name || "NAXORA Institute",
    planName: plan.planName,
    billingCycle: enumValue(body.billingCycle, ["monthly", "yearly"], plan.billingCycle),
    price: numberValue(body.price, plan.price, 0, 999999),
    maxLiveClasses: numberValue(body.maxLiveClasses, plan.maxLiveClasses, 1, 99999),
    maxStudentsPerClass: numberValue(body.maxStudentsPerClass, plan.maxStudentsPerClass, 1, 50000),
    recordingHours: numberValue(body.recordingHours, plan.recordingHours, 0, 99999),
    commentsEnabled: body.commentsEnabled !== false,
    status: enumValue(body.status, ["trial", "active", "past_due", "paused", "cancelled", "expired"], "trial"),
    startDate: body.startDate ? new Date(body.startDate) : new Date(),
    endDate: body.endDate ? new Date(body.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    paymentMode: enumValue(body.paymentMode, ["cash", "upi", "bank", "razorpay", "card", "other"], "upi"),
    lastPaymentAmount: numberValue(body.lastPaymentAmount, 0, 0, 999999),
    notes: clean(body.notes),
    createdBy: user._id,
  };
}
function subscriptionResponse(item) {
  return {
    id: item._id,
    instituteName: item.instituteName,
    planName: item.planName,
    billingCycle: item.billingCycle,
    price: item.price,
    maxLiveClasses: item.maxLiveClasses,
    maxStudentsPerClass: item.maxStudentsPerClass,
    recordingHours: item.recordingHours,
    commentsEnabled: item.commentsEnabled,
    status: item.status,
    startDate: item.startDate,
    endDate: item.endDate,
    paymentMode: item.paymentMode,
    lastPaymentAmount: item.lastPaymentAmount,
    notes: item.notes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
async function summary(user) {
  const filter = ownerFilter(user);
  const [totalClasses, liveNow, scheduled, completed, totalComments, activeSubs] = await Promise.all([
    LiveClass.countDocuments(filter),
    LiveClass.countDocuments({ ...filter, status: "live" }),
    LiveClass.countDocuments({ ...filter, status: "scheduled" }),
    LiveClass.countDocuments({ ...filter, status: "completed" }),
    LiveClassComment.countDocuments({ createdBy: user._id }),
    LiveClassSubscription.countDocuments({ ...filter, status: { $in: ["trial", "active"] } }),
  ]);
  return { totalClasses, liveNow, scheduled, completed, totalComments, activeLiveSubscriptions: activeSubs };
}

export async function liveClassStatus(req, res) {
  res.json({
    success: true,
    part: "Part 39 - Live Classes + Comments + Separate Subscription",
    routes: ["GET/POST /api/live-classes", "POST /api/live-classes/:id/comments", "GET/POST /api/live-classes/subscriptions"],
    subscription: "Live Classes ka subscription NAXORA OS base subscription se alag rakha gaya hai.",
    frontendFiles: ["frontend/live-classes.html", "frontend/live-classes.css", "frontend/live-classes.js"],
  });
}

export async function getLivePlans(req, res) {
  res.json({ success: true, plans: LIVE_PLANS });
}

export async function getLiveClasses(req, res, next) {
  try {
    const { status = "", search = "" } = req.query;
    const filter = ownerFilter(req.user);
    if (status.trim()) filter.status = status.trim();
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ title: regex }, { subject: regex }, { topic: regex }, { batchName: regex }, { teacherName: regex }];
    }
    const [items, stats] = await Promise.all([
      LiveClass.find(filter).sort({ startAt: -1 }).limit(200),
      summary(req.user),
    ]);
    res.json({ success: true, ...stats, classes: items.map(classResponse) });
  } catch (error) { next(error); }
}

export async function createLiveClass(req, res, next) {
  try {
    const payload = liveClassPayload(req.body, req.user);
    const error = validateLiveClass(payload);
    if (error) return res.status(400).json({ success: false, message: error });
    const item = await LiveClass.create(payload);
    res.status(201).json({ success: true, message: "Live class schedule ho gayi", liveClass: classResponse(item) });
  } catch (error) { next(error); }
}

export async function getLiveClassById(req, res, next) {
  try {
    const item = await LiveClass.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: "Live class nahi mili" });
    res.json({ success: true, liveClass: classResponse(item) });
  } catch (error) { next(error); }
}

export async function updateLiveClass(req, res, next) {
  try {
    const payload = liveClassPayload(req.body, req.user);
    delete payload.createdBy;
    const error = validateLiveClass({ ...payload, createdBy: req.user._id });
    if (error) return res.status(400).json({ success: false, message: error });
    const item = await LiveClass.findOneAndUpdate({ _id: req.params.id, createdBy: req.user._id }, payload, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: "Live class nahi mili" });
    res.json({ success: true, message: "Live class update ho gayi", liveClass: classResponse(item) });
  } catch (error) { next(error); }
}

export async function updateLiveClassStatus(req, res, next) {
  try {
    const status = enumValue(req.body.status, ["scheduled", "live", "completed", "cancelled"], "scheduled");
    const item = await LiveClass.findOneAndUpdate({ _id: req.params.id, createdBy: req.user._id }, { status }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: "Live class nahi mili" });
    res.json({ success: true, message: `Live class status ${status} ho gaya`, liveClass: classResponse(item) });
  } catch (error) { next(error); }
}

export async function deleteLiveClass(req, res, next) {
  try {
    const item = await LiveClass.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: "Live class nahi mili" });
    await LiveClassComment.deleteMany({ liveClass: item._id });
    res.json({ success: true, message: "Live class delete ho gayi" });
  } catch (error) { next(error); }
}

export async function getLiveClassComments(req, res, next) {
  try {
    const liveClass = await LiveClass.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!liveClass) return res.status(404).json({ success: false, message: "Live class nahi mili" });
    const comments = await LiveClassComment.find({ liveClass: liveClass._id, status: "visible" }).sort({ isPinned: -1, createdAt: -1 }).limit(200);
    res.json({ success: true, comments: comments.map(commentResponse) });
  } catch (error) { next(error); }
}

export async function addLiveClassComment(req, res, next) {
  try {
    const liveClass = await LiveClass.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!liveClass) return res.status(404).json({ success: false, message: "Live class nahi mili" });
    if (!liveClass.commentsEnabled) return res.status(400).json({ success: false, message: "Is class me comments disabled hain" });
    const text = clean(req.body.text);
    if (!text) return res.status(400).json({ success: false, message: "Comment text required hai" });
    const comment = await LiveClassComment.create({ liveClass: liveClass._id, text, authorName: clean(req.body.authorName) || req.user.name || "NAXORA User", authorRole: req.user.role || "student", isPinned: req.body.isPinned === true, createdBy: req.user._id });
    await LiveClass.updateOne({ _id: liveClass._id }, { $inc: { totalComments: 1 } });
    res.status(201).json({ success: true, message: "Comment add ho gaya", comment: commentResponse(comment) });
  } catch (error) { next(error); }
}

export async function deleteLiveClassComment(req, res, next) {
  try {
    const comment = await LiveClassComment.findOneAndUpdate({ _id: req.params.commentId, createdBy: req.user._id }, { status: "hidden" }, { new: true });
    if (!comment) return res.status(404).json({ success: false, message: "Comment nahi mila" });
    res.json({ success: true, message: "Comment hide ho gaya" });
  } catch (error) { next(error); }
}

export async function getLiveSubscriptions(req, res, next) {
  try {
    const [items, stats] = await Promise.all([
      LiveClassSubscription.find(ownerFilter(req.user)).sort({ updatedAt: -1 }).limit(50),
      summary(req.user),
    ]);
    res.json({ success: true, ...stats, subscriptions: items.map(subscriptionResponse), plans: LIVE_PLANS });
  } catch (error) { next(error); }
}

export async function createLiveSubscription(req, res, next) {
  try {
    const payload = subscriptionPayload(req.body, req.user);
    if (!payload.instituteName) return res.status(400).json({ success: false, message: "Institute name required hai" });
    const item = await LiveClassSubscription.create(payload);
    res.status(201).json({ success: true, message: "Live Classes subscription save ho gaya", subscription: subscriptionResponse(item) });
  } catch (error) { next(error); }
}

export async function updateLiveSubscriptionStatus(req, res, next) {
  try {
    const status = enumValue(req.body.status, ["trial", "active", "past_due", "paused", "cancelled", "expired"], "active");
    const item = await LiveClassSubscription.findOneAndUpdate({ _id: req.params.id, createdBy: req.user._id }, { status }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: "Live subscription nahi mili" });
    res.json({ success: true, message: `Live subscription status ${status} ho gaya`, subscription: subscriptionResponse(item) });
  } catch (error) { next(error); }
}
