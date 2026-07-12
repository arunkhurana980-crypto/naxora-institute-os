import Branch from "../models/Branch.js";

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

function facilitiesFromBody(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).slice(0, 20);
  return clean(value)
    .split(",")
    .map((item) => clean(item))
    .filter(Boolean)
    .slice(0, 20);
}

function buildPayload(body, user) {
  return {
    branchName: clean(body.branchName),
    branchCode: clean(body.branchCode).toUpperCase(),
    branchType: enumValue(body.branchType, ["main", "franchise", "online", "partner", "temporary"], "main"),
    address: clean(body.address),
    city: clean(body.city),
    district: clean(body.district),
    state: clean(body.state) || "Haryana",
    pinCode: clean(body.pinCode),
    managerName: clean(body.managerName),
    managerPhone: clean(body.managerPhone),
    managerEmail: clean(body.managerEmail).toLowerCase(),
    contactPhone: clean(body.contactPhone),
    contactEmail: clean(body.contactEmail).toLowerCase(),
    openingDate: dateOrNull(body.openingDate),
    status: enumValue(body.status, ["planning", "active", "inactive", "closed"], "active"),
    capacity: numberValue(body.capacity),
    currentStudents: numberValue(body.currentStudents),
    currentTeachers: numberValue(body.currentTeachers),
    monthlyRevenue: numberValue(body.monthlyRevenue),
    monthlyExpense: numberValue(body.monthlyExpense),
    facilities: facilitiesFromBody(body.facilities),
    notes: clean(body.notes),
    instituteName: user.instituteName || "NAXORA Institute",
    createdBy: user._id,
  };
}

function validatePayload(payload) {
  if (!payload.branchName) return "Branch name required hai";
  if (!payload.branchCode) return "Branch code required hai";
  if (payload.currentStudents > payload.capacity && payload.capacity > 0) return "Current students capacity se zyada nahi hone chahiye";
  return "";
}

function toResponse(branch) {
  const profit = Number(branch.monthlyRevenue || 0) - Number(branch.monthlyExpense || 0);
  const occupancy = branch.capacity ? Math.round((Number(branch.currentStudents || 0) / Number(branch.capacity)) * 100) : 0;
  return {
    id: branch._id,
    branchName: branch.branchName,
    branchCode: branch.branchCode,
    branchType: branch.branchType,
    address: branch.address,
    city: branch.city,
    district: branch.district,
    state: branch.state,
    pinCode: branch.pinCode,
    managerName: branch.managerName,
    managerPhone: branch.managerPhone,
    managerEmail: branch.managerEmail,
    contactPhone: branch.contactPhone,
    contactEmail: branch.contactEmail,
    openingDate: branch.openingDate,
    status: branch.status,
    capacity: branch.capacity,
    currentStudents: branch.currentStudents,
    currentTeachers: branch.currentTeachers,
    monthlyRevenue: branch.monthlyRevenue,
    monthlyExpense: branch.monthlyExpense,
    monthlyProfit: profit,
    occupancyPercent: occupancy,
    facilities: branch.facilities || [],
    notes: branch.notes,
    instituteName: branch.instituteName,
    createdAt: branch.createdAt,
    updatedAt: branch.updatedAt,
  };
}

async function buildSummary(ownerFilter) {
  const [
    total,
    active,
    planning,
    inactive,
    revenueAgg,
    expenseAgg,
    studentsAgg,
    teachersAgg,
    capacityAgg,
  ] = await Promise.all([
    Branch.countDocuments(ownerFilter),
    Branch.countDocuments({ ...ownerFilter, status: "active" }),
    Branch.countDocuments({ ...ownerFilter, status: "planning" }),
    Branch.countDocuments({ ...ownerFilter, status: { $in: ["inactive", "closed"] } }),
    Branch.aggregate([{ $match: ownerFilter }, { $group: { _id: null, total: { $sum: "$monthlyRevenue" } } }]),
    Branch.aggregate([{ $match: ownerFilter }, { $group: { _id: null, total: { $sum: "$monthlyExpense" } } }]),
    Branch.aggregate([{ $match: ownerFilter }, { $group: { _id: null, total: { $sum: "$currentStudents" } } }]),
    Branch.aggregate([{ $match: ownerFilter }, { $group: { _id: null, total: { $sum: "$currentTeachers" } } }]),
    Branch.aggregate([{ $match: ownerFilter }, { $group: { _id: null, total: { $sum: "$capacity" } } }]),
  ]);

  const monthlyRevenue = revenueAgg[0]?.total || 0;
  const monthlyExpense = expenseAgg[0]?.total || 0;
  const totalStudents = studentsAgg[0]?.total || 0;
  const totalCapacity = capacityAgg[0]?.total || 0;
  return {
    totalBranches: total,
    activeBranches: active,
    planningBranches: planning,
    inactiveBranches: inactive,
    monthlyRevenue,
    monthlyExpense,
    monthlyProfit: monthlyRevenue - monthlyExpense,
    totalStudents,
    totalTeachers: teachersAgg[0]?.total || 0,
    totalCapacity,
    occupancyPercent: totalCapacity ? Math.round((totalStudents / totalCapacity) * 100) : 0,
  };
}

export async function createBranch(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const exists = await Branch.findOne({ createdBy: req.user._id, branchCode: payload.branchCode });
    if (exists) return res.status(409).json({ success: false, message: "Ye branch code already use ho raha hai" });

    const branch = await Branch.create(payload);
    res.status(201).json({ success: true, message: "Branch save ho gayi", branch: toResponse(branch) });
  } catch (error) {
    next(error);
  }
}

export async function getBranches(req, res, next) {
  try {
    const { search = "", status = "", branchType = "", city = "" } = req.query;
    const ownerFilter = { createdBy: req.user._id };
    const filter = { ...ownerFilter };

    if (status.trim()) filter.status = status.trim();
    if (branchType.trim()) filter.branchType = branchType.trim();
    if (city.trim()) filter.city = new RegExp(city.trim(), "i");

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { branchName: regex },
        { branchCode: regex },
        { city: regex },
        { district: regex },
        { managerName: regex },
        { contactPhone: regex },
      ];
    }

    const [branches, summary] = await Promise.all([
      Branch.find(filter).sort({ createdAt: -1 }).limit(200),
      buildSummary(ownerFilter),
    ]);

    res.json({ success: true, ...summary, branches: branches.map(toResponse) });
  } catch (error) {
    next(error);
  }
}

export async function getBranchById(req, res, next) {
  try {
    const branch = await Branch.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!branch) return res.status(404).json({ success: false, message: "Branch nahi mili" });
    res.json({ success: true, branch: toResponse(branch) });
  } catch (error) {
    next(error);
  }
}

export async function updateBranch(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const exists = await Branch.findOne({ createdBy: req.user._id, branchCode: payload.branchCode, _id: { $ne: req.params.id } });
    if (exists) return res.status(409).json({ success: false, message: "Ye branch code already use ho raha hai" });

    const branch = await Branch.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );

    if (!branch) return res.status(404).json({ success: false, message: "Branch nahi mili" });
    res.json({ success: true, message: "Branch update ho gayi", branch: toResponse(branch) });
  } catch (error) {
    next(error);
  }
}

export async function updateBranchStatus(req, res, next) {
  try {
    const status = enumValue(req.body.status, ["planning", "active", "inactive", "closed"], "active");
    const branch = await Branch.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status },
      { new: true, runValidators: true }
    );

    if (!branch) return res.status(404).json({ success: false, message: "Branch nahi mili" });
    res.json({ success: true, message: "Branch status update ho gaya", branch: toResponse(branch) });
  } catch (error) {
    next(error);
  }
}

export async function deleteBranch(req, res, next) {
  try {
    const branch = await Branch.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!branch) return res.status(404).json({ success: false, message: "Branch nahi mili" });
    res.json({ success: true, message: "Branch delete ho gayi" });
  } catch (error) {
    next(error);
  }
}
