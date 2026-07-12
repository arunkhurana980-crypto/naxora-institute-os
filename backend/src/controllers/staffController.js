import Staff from "../models/Staff.js";

function clean(value = "") {
  return String(value || "").trim();
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function numberValue(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
}

function dateValue(value, fallback = new Date()) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function buildPayload(body, user) {
  return {
    name: clean(body.name),
    email: clean(body.email).toLowerCase(),
    phone: clean(body.phone),
    gender: enumValue(body.gender, ["male", "female", "other", "not_set"], "not_set"),
    staffRole: enumValue(
      body.staffRole,
      ["receptionist", "accountant", "counsellor", "office_admin", "support_staff", "marketing", "cleaning", "security", "other"],
      "other"
    ),
    department: clean(body.department),
    shift: enumValue(body.shift, ["morning", "afternoon", "evening", "full_day", "flexible", "not_set"], "not_set"),
    joiningDate: dateValue(body.joiningDate),
    salaryAmount: numberValue(body.salaryAmount),
    salaryStatus: enumValue(body.salaryStatus, ["paid", "pending", "partial", "not_set"], "not_set"),
    attendanceStatus: enumValue(body.attendanceStatus, ["present", "absent", "late", "leave", "not_marked"], "not_marked"),
    status: enumValue(body.status, ["active", "inactive", "on_leave"], "active"),
    emergencyContact: clean(body.emergencyContact),
    address: clean(body.address),
    notes: clean(body.notes),
    instituteName: user.instituteName || "NAXORA Institute",
    createdBy: user._id,
  };
}

function validatePayload(payload) {
  if (!payload.name) return "Staff name required hai";
  if (payload.name.length < 2) return "Staff name minimum 2 characters ka hona chahiye";
  return "";
}

function toResponse(staff) {
  return {
    id: staff._id,
    name: staff.name,
    email: staff.email,
    phone: staff.phone,
    gender: staff.gender,
    staffRole: staff.staffRole,
    department: staff.department,
    shift: staff.shift,
    joiningDate: staff.joiningDate,
    salaryAmount: staff.salaryAmount,
    salaryStatus: staff.salaryStatus,
    attendanceStatus: staff.attendanceStatus,
    status: staff.status,
    emergencyContact: staff.emergencyContact,
    address: staff.address,
    notes: staff.notes,
    instituteName: staff.instituteName,
    createdAt: staff.createdAt,
    updatedAt: staff.updatedAt,
  };
}

async function buildSummary(ownerFilter) {
  const [
    total,
    active,
    onLeave,
    pendingSalary,
    presentToday,
    absentToday,
    lateToday,
    salaryAgg,
  ] = await Promise.all([
    Staff.countDocuments(ownerFilter),
    Staff.countDocuments({ ...ownerFilter, status: "active" }),
    Staff.countDocuments({ ...ownerFilter, status: "on_leave" }),
    Staff.countDocuments({ ...ownerFilter, salaryStatus: { $in: ["pending", "partial"] } }),
    Staff.countDocuments({ ...ownerFilter, attendanceStatus: "present" }),
    Staff.countDocuments({ ...ownerFilter, attendanceStatus: "absent" }),
    Staff.countDocuments({ ...ownerFilter, attendanceStatus: "late" }),
    Staff.aggregate([
      { $match: ownerFilter },
      { $group: { _id: null, total: { $sum: "$salaryAmount" } } },
    ]),
  ]);

  return {
    total,
    active,
    onLeave,
    pendingSalary,
    presentToday,
    absentToday,
    lateToday,
    monthlySalaryLoad: salaryAgg[0]?.total || 0,
  };
}

export async function createStaff(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const staff = await Staff.create(payload);
    res.status(201).json({ success: true, message: "Staff member successfully add ho gaya", staff: toResponse(staff) });
  } catch (error) {
    next(error);
  }
}

export async function getStaffMembers(req, res, next) {
  try {
    const { search = "", status = "", role = "", salaryStatus = "", attendanceStatus = "", department = "" } = req.query;
    const ownerFilter = { createdBy: req.user._id };
    const filter = { ...ownerFilter };

    if (status.trim()) filter.status = status.trim();
    if (role.trim()) filter.staffRole = role.trim();
    if (salaryStatus.trim()) filter.salaryStatus = salaryStatus.trim();
    if (attendanceStatus.trim()) filter.attendanceStatus = attendanceStatus.trim();
    if (department.trim()) filter.department = new RegExp(department.trim(), "i");

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { department: regex },
        { emergencyContact: regex },
        { address: regex },
        { notes: regex },
      ];
    }

    const staff = await Staff.find(filter).sort({ createdAt: -1 }).limit(220);
    const summary = await buildSummary(ownerFilter);

    res.json({
      success: true,
      count: staff.length,
      ...summary,
      staff: staff.map(toResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function getStaffById(req, res, next) {
  try {
    const staff = await Staff.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!staff) return res.status(404).json({ success: false, message: "Staff record nahi mila" });
    res.json({ success: true, staff: toResponse(staff) });
  } catch (error) {
    next(error);
  }
}

export async function updateStaff(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    delete payload.createdBy;
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const staff = await Staff.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );
    if (!staff) return res.status(404).json({ success: false, message: "Staff record nahi mila" });
    res.json({ success: true, message: "Staff record update ho gaya", staff: toResponse(staff) });
  } catch (error) {
    next(error);
  }
}

export async function updateStaffStatus(req, res, next) {
  try {
    const payload = {};
    if (req.body.status) payload.status = enumValue(req.body.status, ["active", "inactive", "on_leave"], "active");
    if (req.body.salaryStatus) payload.salaryStatus = enumValue(req.body.salaryStatus, ["paid", "pending", "partial", "not_set"], "not_set");
    if (req.body.attendanceStatus) payload.attendanceStatus = enumValue(
      req.body.attendanceStatus,
      ["present", "absent", "late", "leave", "not_marked"],
      "not_marked"
    );

    const staff = await Staff.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );
    if (!staff) return res.status(404).json({ success: false, message: "Staff record nahi mila" });
    res.json({ success: true, message: "Staff status update ho gaya", staff: toResponse(staff) });
  } catch (error) {
    next(error);
  }
}

export async function deleteStaff(req, res, next) {
  try {
    const staff = await Staff.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!staff) return res.status(404).json({ success: false, message: "Staff record nahi mila" });
    res.json({ success: true, message: "Staff record delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
