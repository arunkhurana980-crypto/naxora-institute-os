import Parent from "../models/Parent.js";

function clean(value = "") {
  return String(value || "").trim();
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function numberValue(value, fallback = 0, max = null) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return max === null ? num : Math.min(num, max);
}

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildChildren(children = []) {
  const rows = Array.isArray(children) ? children : [];
  return rows
    .map((child) => ({
      studentName: clean(child.studentName),
      rollNo: clean(child.rollNo),
      courseName: clean(child.courseName),
      batchName: clean(child.batchName),
      classLevel: clean(child.classLevel),
      attendancePercent: numberValue(child.attendancePercent, 0, 100),
      feeStatus: enumValue(child.feeStatus, ["paid", "pending", "partial", "overdue", "not_set"], "not_set"),
      resultStatus: enumValue(child.resultStatus, ["excellent", "good", "average", "needs_attention", "not_set"], "not_set"),
      lastScore: numberValue(child.lastScore, 0),
      nextAction: clean(child.nextAction),
    }))
    .filter((child) => child.studentName);
}

function buildPayload(body, user) {
  return {
    parentName: clean(body.parentName),
    relation: enumValue(body.relation, ["father", "mother", "guardian", "brother", "sister", "other"], "guardian"),
    phone: clean(body.phone),
    alternatePhone: clean(body.alternatePhone),
    email: clean(body.email).toLowerCase(),
    address: clean(body.address),
    occupation: clean(body.occupation),
    preferredContactMode: enumValue(body.preferredContactMode, ["phone", "whatsapp", "email", "in_person", "not_set"], "phone"),
    portalAccess: enumValue(body.portalAccess, ["enabled", "disabled", "pending"], "pending"),
    status: enumValue(body.status, ["active", "inactive", "needs_followup"], "active"),
    children: buildChildren(body.children),
    lastMeetingDate: dateValue(body.lastMeetingDate),
    nextFollowUpDate: dateValue(body.nextFollowUpDate),
    notes: clean(body.notes),
    instituteName: user.instituteName || "NAXORA Institute",
    createdBy: user._id,
  };
}

function validatePayload(payload) {
  if (!payload.parentName) return "Parent name required hai";
  if (payload.parentName.length < 2) return "Parent name minimum 2 characters ka hona chahiye";
  if (!payload.phone && !payload.email) return "Parent ka phone ya email me se ek required hai";
  if (!payload.children.length) return "Kam se kam ek child/student link karna required hai";
  return "";
}

function toResponse(parent) {
  return {
    id: parent._id,
    parentName: parent.parentName,
    relation: parent.relation,
    phone: parent.phone,
    alternatePhone: parent.alternatePhone,
    email: parent.email,
    address: parent.address,
    occupation: parent.occupation,
    preferredContactMode: parent.preferredContactMode,
    portalAccess: parent.portalAccess,
    status: parent.status,
    children: parent.children || [],
    lastMeetingDate: parent.lastMeetingDate,
    nextFollowUpDate: parent.nextFollowUpDate,
    notes: parent.notes,
    instituteName: parent.instituteName,
    createdAt: parent.createdAt,
    updatedAt: parent.updatedAt,
  };
}

async function buildSummary(ownerFilter) {
  const [total, active, followup, portalEnabled, childAgg, pendingFeeParents] = await Promise.all([
    Parent.countDocuments(ownerFilter),
    Parent.countDocuments({ ...ownerFilter, status: "active" }),
    Parent.countDocuments({ ...ownerFilter, status: "needs_followup" }),
    Parent.countDocuments({ ...ownerFilter, portalAccess: "enabled" }),
    Parent.aggregate([
      { $match: ownerFilter },
      { $project: { count: { $size: { $ifNull: ["$children", []] } } } },
      { $group: { _id: null, total: { $sum: "$count" } } },
    ]),
    Parent.countDocuments({ ...ownerFilter, "children.feeStatus": { $in: ["pending", "partial", "overdue"] } }),
  ]);

  return {
    total,
    active,
    followup,
    portalEnabled,
    totalChildren: childAgg[0]?.total || 0,
    pendingFeeParents,
  };
}

export async function createParent(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const parent = await Parent.create(payload);
    res.status(201).json({ success: true, message: "Parent profile successfully add ho gaya", parent: toResponse(parent) });
  } catch (error) {
    next(error);
  }
}

export async function getParents(req, res, next) {
  try {
    const { search = "", status = "", relation = "", portalAccess = "", feeStatus = "" } = req.query;
    const ownerFilter = { createdBy: req.user._id };
    const filter = { ...ownerFilter };

    if (status.trim()) filter.status = status.trim();
    if (relation.trim()) filter.relation = relation.trim();
    if (portalAccess.trim()) filter.portalAccess = portalAccess.trim();
    if (feeStatus.trim()) filter["children.feeStatus"] = feeStatus.trim();

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { parentName: regex },
        { phone: regex },
        { alternatePhone: regex },
        { email: regex },
        { address: regex },
        { occupation: regex },
        { notes: regex },
        { "children.studentName": regex },
        { "children.rollNo": regex },
        { "children.courseName": regex },
        { "children.batchName": regex },
      ];
    }

    const parents = await Parent.find(filter).sort({ createdAt: -1 }).limit(250);
    const summary = await buildSummary(ownerFilter);

    res.json({
      success: true,
      count: parents.length,
      ...summary,
      parents: parents.map(toResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function getParentById(req, res, next) {
  try {
    const parent = await Parent.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!parent) return res.status(404).json({ success: false, message: "Parent profile nahi mila" });
    res.json({ success: true, parent: toResponse(parent) });
  } catch (error) {
    next(error);
  }
}

export async function updateParent(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    delete payload.createdBy;
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const parent = await Parent.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );
    if (!parent) return res.status(404).json({ success: false, message: "Parent profile nahi mila" });
    res.json({ success: true, message: "Parent profile update ho gaya", parent: toResponse(parent) });
  } catch (error) {
    next(error);
  }
}

export async function updateParentStatus(req, res, next) {
  try {
    const payload = {};
    if (req.body.status) payload.status = enumValue(req.body.status, ["active", "inactive", "needs_followup"], "active");
    if (req.body.portalAccess) payload.portalAccess = enumValue(req.body.portalAccess, ["enabled", "disabled", "pending"], "pending");
    if (req.body.nextFollowUpDate !== undefined) payload.nextFollowUpDate = dateValue(req.body.nextFollowUpDate);

    const parent = await Parent.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );
    if (!parent) return res.status(404).json({ success: false, message: "Parent profile nahi mila" });
    res.json({ success: true, message: "Parent status update ho gaya", parent: toResponse(parent) });
  } catch (error) {
    next(error);
  }
}

export async function deleteParent(req, res, next) {
  try {
    const parent = await Parent.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!parent) return res.status(404).json({ success: false, message: "Parent profile nahi mila" });
    res.json({ success: true, message: "Parent profile delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
