import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import Branch from "../models/Branch.js";
import AdmissionEnquiry from "../models/AdmissionEnquiry.js";
import FinanceRecord from "../models/FinanceRecord.js";
import SuperAdminAction from "../models/SuperAdminAction.js";

function clean(value = "") { return String(value || "").trim(); }
function enumValue(value, allowed, fallback) { return allowed.includes(value) ? value : fallback; }
function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
function inDays(days) {
  const date = startOfToday();
  date.setDate(date.getDate() + Number(days || 0));
  return date;
}
function daysLeft(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return Math.round((date - startOfToday()) / (1000 * 60 * 60 * 24));
}
function moneyNumber(value = 0) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
function activeAddonTotal(item) {
  return (item.addons || [])
    .filter((addon) => addon.enabled && addon.status === "active")
    .reduce((sum, addon) => sum + moneyNumber(addon.price), 0);
}
function amountDue(item) {
  return Math.max(moneyNumber(item.basePrice) - moneyNumber(item.discount), 0) + activeAddonTotal(item);
}
function toInstitute(item) {
  const obj = item.toObject ? item.toObject() : item;
  const due = amountDue(obj);
  const left = daysLeft(obj.expiryDate);
  const vani = (obj.addons || []).find((addon) => addon.key === "vani_ai" && addon.enabled && addon.status === "active");
  return {
    id: obj._id,
    instituteName: obj.instituteName,
    ownerName: obj.ownerName,
    ownerPhone: obj.ownerPhone,
    ownerEmail: obj.ownerEmail,
    city: obj.city,
    planName: obj.planName,
    billingCycle: obj.billingCycle,
    status: obj.status,
    expiryDate: obj.expiryDate,
    daysLeft: left,
    amountDue: due,
    lastPaymentAmount: obj.lastPaymentAmount || 0,
    studentsUsed: obj.usage?.students || 0,
    branchesUsed: obj.usage?.branches || 0,
    aiDoubtsUsed: obj.usage?.aiDoubtsThisMonth || 0,
    vaniEnabled: Boolean(vani),
    risk: obj.status === "past_due" || obj.status === "expired" || (left !== null && left < 0) ? "high" : left !== null && left <= 7 ? "medium" : "low",
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

export async function getSuperAdminOverview(req, res, next) {
  try {
    const ownerFilter = { createdBy: req.user._id };
    const { search = "", status = "", planName = "" } = req.query;
    const filter = { ...ownerFilter };
    if (status) filter.status = status;
    if (planName) filter.planName = planName;
    if (clean(search)) {
      const regex = new RegExp(clean(search), "i");
      filter.$or = [
        { instituteName: regex },
        { ownerName: regex },
        { ownerPhone: regex },
        { ownerEmail: regex },
        { city: regex },
        { internalTag: regex },
      ];
    }

    const today = startOfToday();
    const week = inDays(7);
    const month = inDays(30);

    const [
      institutes,
      totalInstitutes,
      activeInstitutes,
      trialInstitutes,
      pastDueInstitutes,
      expiredInstitutes,
      expiring7,
      expiring30,
      planAgg,
      revenueAgg,
      users,
      students,
      teachers,
      branches,
      enquiries,
      financeIncome,
      financeExpense,
      recentActions,
    ] = await Promise.all([
      Subscription.find(filter).sort({ updatedAt: -1 }).limit(300),
      Subscription.countDocuments(ownerFilter),
      Subscription.countDocuments({ ...ownerFilter, status: "active" }),
      Subscription.countDocuments({ ...ownerFilter, status: "trial" }),
      Subscription.countDocuments({ ...ownerFilter, status: "past_due" }),
      Subscription.countDocuments({ ...ownerFilter, $or: [{ status: "expired" }, { expiryDate: { $lt: today } }] }),
      Subscription.countDocuments({ ...ownerFilter, status: { $in: ["active", "trial", "past_due"] }, expiryDate: { $gte: today, $lte: week } }),
      Subscription.countDocuments({ ...ownerFilter, status: { $in: ["active", "trial", "past_due"] }, expiryDate: { $gte: today, $lte: month } }),
      Subscription.aggregate([
        { $match: ownerFilter },
        { $group: { _id: "$planName", count: { $sum: 1 }, base: { $sum: "$basePrice" }, paid: { $sum: "$lastPaymentAmount" } } },
        { $sort: { count: -1 } },
      ]),
      Subscription.aggregate([
        { $match: ownerFilter },
        { $group: { _id: null, base: { $sum: "$basePrice" }, discount: { $sum: "$discount" }, paid: { $sum: "$lastPaymentAmount" } } },
      ]),
      User.countDocuments({}),
      Student.countDocuments(ownerFilter),
      Teacher.countDocuments(ownerFilter),
      Branch.countDocuments(ownerFilter),
      AdmissionEnquiry.countDocuments(ownerFilter),
      FinanceRecord.aggregate([{ $match: { ...ownerFilter, type: "income" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      FinanceRecord.aggregate([{ $match: { ...ownerFilter, type: "expense" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      SuperAdminAction.find(ownerFilter).sort({ createdAt: -1 }).limit(20),
    ]);

    const revenue = revenueAgg[0] || { base: 0, discount: 0, paid: 0 };
    const estimatedMRR = Math.max(moneyNumber(revenue.base) - moneyNumber(revenue.discount), 0);
    const income = financeIncome[0]?.total || 0;
    const expense = financeExpense[0]?.total || 0;

    const alerts = [];
    if (pastDueInstitutes > 0) alerts.push({ type: "payment", priority: "high", title: `${pastDueInstitutes} institutes past due`, message: "In institutes ko payment follow-up chahiye." });
    if (expiring7 > 0) alerts.push({ type: "expiry", priority: "medium", title: `${expiring7} subscriptions expiring in 7 days`, message: "Renewal reminders bhejne ka time hai." });
    if (trialInstitutes > 0) alerts.push({ type: "trial", priority: "normal", title: `${trialInstitutes} trial institutes`, message: "Trial users ko Pro/Premium conversion pipeline me daalo." });

    res.json({
      success: true,
      part: "Part 26 - Super Admin Panel",
      summary: {
        totalInstitutes,
        activeInstitutes,
        trialInstitutes,
        pastDueInstitutes,
        expiredInstitutes,
        expiring7,
        expiring30,
        totalUsers: users,
        totalStudents: students,
        totalTeachers: teachers,
        totalBranches: branches,
        totalEnquiries: enquiries,
        estimatedMRR,
        collectedAmount: revenue.paid || 0,
        totalIncome: income,
        totalExpense: expense,
        netProfit: income - expense,
      },
      planBreakdown: planAgg.map((item) => ({ planName: item._id || "unknown", count: item.count || 0, base: item.base || 0, paid: item.paid || 0 })),
      alerts,
      institutes: institutes.map(toInstitute),
      recentActions: recentActions.map((item) => ({ ...item.toObject(), id: item._id })),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateInstituteStatus(req, res, next) {
  try {
    const status = enumValue(req.body.status, ["trial", "active", "past_due", "paused", "cancelled", "expired"], "active");
    const institute = await Subscription.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!institute) return res.status(404).json({ success: false, message: "Institute subscription record nahi mila" });
    const oldValue = institute.status;
    institute.status = status;
    await institute.save();
    await SuperAdminAction.create({ actionType: "status_change", instituteId: institute._id, instituteName: institute.instituteName, title: "Institute status changed", note: clean(req.body.note), oldValue, newValue: status, priority: status === "past_due" || status === "expired" ? "high" : "normal", createdBy: req.user._id });
    res.json({ success: true, message: `Institute status ${status} ho gaya`, institute: toInstitute(institute) });
  } catch (error) { next(error); }
}

export async function updateInstitutePlan(req, res, next) {
  try {
    const planName = enumValue(req.body.planName, ["free", "starter", "pro", "premium", "enterprise"], "pro");
    const institute = await Subscription.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!institute) return res.status(404).json({ success: false, message: "Institute subscription record nahi mila" });
    const oldValue = institute.planName;
    institute.planName = planName;
    if (req.body.basePrice !== undefined) institute.basePrice = Math.max(Number(req.body.basePrice) || 0, 0);
    await institute.save();
    await SuperAdminAction.create({ actionType: "plan_change", instituteId: institute._id, instituteName: institute.instituteName, title: "Institute plan changed", note: clean(req.body.note), oldValue, newValue: planName, priority: "normal", createdBy: req.user._id });
    res.json({ success: true, message: `Plan ${planName} me update ho gaya`, institute: toInstitute(institute) });
  } catch (error) { next(error); }
}

export async function addSuperAdminNote(req, res, next) {
  try {
    const institute = req.body.instituteId ? await Subscription.findOne({ _id: req.body.instituteId, createdBy: req.user._id }) : null;
    const action = await SuperAdminAction.create({
      actionType: enumValue(req.body.actionType, ["note", "payment_note", "support_note"], "note"),
      instituteId: institute?._id || null,
      instituteName: institute?.instituteName || clean(req.body.instituteName),
      title: clean(req.body.title) || "Super Admin Note",
      note: clean(req.body.note),
      priority: enumValue(req.body.priority, ["low", "normal", "high", "urgent"], "normal"),
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, message: "Super admin note save ho gaya", action: { ...action.toObject(), id: action._id } });
  } catch (error) { next(error); }
}

export async function deleteSuperAdminAction(req, res, next) {
  try {
    const deleted = await SuperAdminAction.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!deleted) return res.status(404).json({ success: false, message: "Action log nahi mila" });
    res.json({ success: true, message: "Action log delete ho gaya" });
  } catch (error) { next(error); }
}
