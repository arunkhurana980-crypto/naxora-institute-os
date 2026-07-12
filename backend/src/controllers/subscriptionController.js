import Subscription from "../models/Subscription.js";

const planCatalog = {
  free: {
    label: "Free Trial",
    monthlyPrice: 0,
    yearlyPrice: 0,
    limits: { students: 25, teachers: 2, branches: 1, aiDoubtsPerMonth: 25, storageGB: 1, users: 2 },
    features: ["Basic dashboard", "Students", "Fees demo", "Limited AI doubts"],
  },
  starter: {
    label: "Starter",
    monthlyPrice: 999,
    yearlyPrice: 9999,
    limits: { students: 150, teachers: 10, branches: 1, aiDoubtsPerMonth: 500, storageGB: 5, users: 8 },
    features: ["Students", "Teachers", "Attendance", "Fees", "Assignments", "Basic reports"],
  },
  pro: {
    label: "Pro",
    monthlyPrice: 2499,
    yearlyPrice: 24999,
    limits: { students: 500, teachers: 35, branches: 3, aiDoubtsPerMonth: 2500, storageGB: 25, users: 25 },
    features: ["All Starter features", "CRM", "Follow-ups", "Question bank", "Test builder", "Reports"],
  },
  premium: {
    label: "Premium",
    monthlyPrice: 4999,
    yearlyPrice: 49999,
    limits: { students: 1500, teachers: 100, branches: 10, aiDoubtsPerMonth: 10000, storageGB: 100, users: 100 },
    features: ["All Pro features", "Multi-branch", "Advanced analytics", "Certificates", "Library", "Priority support"],
  },
  enterprise: {
    label: "Enterprise",
    monthlyPrice: 9999,
    yearlyPrice: 99999,
    limits: { students: 99999, teachers: 9999, branches: 999, aiDoubtsPerMonth: 99999, storageGB: 1000, users: 9999 },
    features: ["Custom limits", "Dedicated support", "Custom branding", "Advanced security", "Onboarding"],
  },
};

const addonCatalog = {
  vani_ai: {
    key: "vani_ai",
    name: "NAXORA VANI AI",
    monthlyPrice: 1499,
    yearlyPrice: 14999,
    foundingMonthlyPrice: 799,
    multiBranchMonthlyPrice: 2999,
    usageCap: 1000,
    features: ["Voice search", "Voice reports", "Voice analytics", "Secure voice actions foundation"],
  },
  whatsapp_sms: { key: "whatsapp_sms", name: "WhatsApp/SMS Alerts", monthlyPrice: 799, yearlyPrice: 7999, usageCap: 2000, features: ["Fee reminders", "Attendance alerts", "Notice broadcast"] },
  advanced_reports: { key: "advanced_reports", name: "Advanced Reports", monthlyPrice: 999, yearlyPrice: 9999, usageCap: 0, features: ["Printable reports", "Branch analytics", "Weak student insights"] },
};

function clean(value = "") { return String(value || "").trim(); }
function numberValue(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
}
function enumValue(value, allowed, fallback) { return allowed.includes(value) ? value : fallback; }
function dateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}
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
function planPrice(planName, billingCycle) {
  const plan = planCatalog[planName] || planCatalog.starter;
  return billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
}
function defaultExpiry(startDate, billingCycle, status) {
  const start = startDate || new Date();
  if (status === "trial") return inDays(14);
  return billingCycle === "yearly" ? addMonths(start, 12) : addMonths(start, 1);
}
function normalizeAddons(addons = []) {
  if (!Array.isArray(addons)) return [];
  return addons.map((addon) => {
    const key = enumValue(addon.key, ["vani_ai", "whatsapp_sms", "advanced_reports", "extra_branch", "custom_branding"], "vani_ai");
    const catalog = addonCatalog[key] || addonCatalog.vani_ai;
    const billingCycle = enumValue(addon.billingCycle, ["monthly", "yearly"], "monthly");
    return {
      key,
      name: clean(addon.name) || catalog.name || "Add-on",
      enabled: Boolean(addon.enabled),
      billingCycle,
      price: numberValue(addon.price, billingCycle === "yearly" ? (catalog.yearlyPrice || 0) : (catalog.monthlyPrice || 0)),
      usageCap: numberValue(addon.usageCap, catalog.usageCap || 0),
      usedThisCycle: numberValue(addon.usedThisCycle, 0),
      status: enumValue(addon.status, ["active", "paused", "cancelled"], "active"),
    };
  });
}
function subscriptionAmount(item) {
  const base = Math.max(Number(item.basePrice || 0) - Number(item.discount || 0), 0);
  const addonTotal = (item.addons || []).filter((a) => a.enabled && a.status === "active").reduce((sum, a) => sum + Number(a.price || 0), 0);
  return base + addonTotal;
}
function daysLeft(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return Math.round((date - startOfToday()) / (1000 * 60 * 60 * 24));
}
function usagePercent(used, limit) {
  const safeLimit = Number(limit || 0);
  if (!safeLimit) return 0;
  return Math.min(100, Math.round((Number(used || 0) / safeLimit) * 100));
}
function toResponse(item) {
  const obj = item.toObject ? item.toObject() : item;
  return {
    ...obj,
    id: obj._id,
    amountDue: subscriptionAmount(obj),
    daysLeft: daysLeft(obj.expiryDate),
    usagePercent: {
      students: usagePercent(obj.usage?.students, obj.limits?.students),
      teachers: usagePercent(obj.usage?.teachers, obj.limits?.teachers),
      branches: usagePercent(obj.usage?.branches, obj.limits?.branches),
      aiDoubts: usagePercent(obj.usage?.aiDoubtsThisMonth, obj.limits?.aiDoubtsPerMonth),
      storage: usagePercent(obj.usage?.storageGBUsed, obj.limits?.storageGB),
      users: usagePercent(obj.usage?.users, obj.limits?.users),
    },
  };
}
function buildPayload(body, existing = null) {
  const planName = enumValue(body.planName, ["free", "starter", "pro", "premium", "enterprise"], existing?.planName || "starter");
  const billingCycle = enumValue(body.billingCycle, ["monthly", "yearly"], existing?.billingCycle || "monthly");
  const status = enumValue(body.status, ["trial", "active", "past_due", "paused", "cancelled", "expired"], existing?.status || "trial");
  const catalog = planCatalog[planName] || planCatalog.starter;
  const startDate = dateOrNull(body.startDate) || existing?.startDate || new Date();
  const expiryDate = dateOrNull(body.expiryDate) || existing?.expiryDate || defaultExpiry(startDate, billingCycle, status);
  const nextBillingDate = dateOrNull(body.nextBillingDate) || existing?.nextBillingDate || expiryDate;

  return {
    instituteName: clean(body.instituteName) || existing?.instituteName,
    ownerName: clean(body.ownerName),
    ownerPhone: clean(body.ownerPhone),
    ownerEmail: clean(body.ownerEmail),
    city: clean(body.city),
    planName,
    billingCycle,
    status,
    startDate,
    expiryDate,
    nextBillingDate,
    trialEndsAt: dateOrNull(body.trialEndsAt) || (status === "trial" ? expiryDate : existing?.trialEndsAt || null),
    basePrice: numberValue(body.basePrice, planPrice(planName, billingCycle)),
    discount: numberValue(body.discount, 0),
    lastPaymentAmount: numberValue(body.lastPaymentAmount, 0),
    paymentMode: enumValue(body.paymentMode, ["cash", "upi", "bank", "card", "razorpay", "other", "none"], "none"),
    limits: {
      students: numberValue(body.limits?.students ?? body.studentLimit, catalog.limits.students),
      teachers: numberValue(body.limits?.teachers ?? body.teacherLimit, catalog.limits.teachers),
      branches: numberValue(body.limits?.branches ?? body.branchLimit, catalog.limits.branches),
      aiDoubtsPerMonth: numberValue(body.limits?.aiDoubtsPerMonth ?? body.aiDoubtLimit, catalog.limits.aiDoubtsPerMonth),
      storageGB: numberValue(body.limits?.storageGB ?? body.storageLimit, catalog.limits.storageGB),
      users: numberValue(body.limits?.users ?? body.userLimit, catalog.limits.users),
    },
    usage: {
      students: numberValue(body.usage?.students ?? body.studentsUsed, existing?.usage?.students || 0),
      teachers: numberValue(body.usage?.teachers ?? body.teachersUsed, existing?.usage?.teachers || 0),
      branches: numberValue(body.usage?.branches ?? body.branchesUsed, existing?.usage?.branches || 0),
      aiDoubtsThisMonth: numberValue(body.usage?.aiDoubtsThisMonth ?? body.aiDoubtsUsed, existing?.usage?.aiDoubtsThisMonth || 0),
      storageGBUsed: numberValue(body.usage?.storageGBUsed ?? body.storageUsed, existing?.usage?.storageGBUsed || 0),
      users: numberValue(body.usage?.users ?? body.usersUsed, existing?.usage?.users || 0),
    },
    features: Array.isArray(body.features) && body.features.length ? body.features.map(clean).filter(Boolean) : catalog.features,
    addons: normalizeAddons(body.addons || existing?.addons || []),
    notes: clean(body.notes),
    internalTag: clean(body.internalTag),
  };
}

export async function getPlanCatalog(req, res) {
  res.json({ success: true, plans: planCatalog, addons: addonCatalog });
}

export async function getSubscriptions(req, res, next) {
  try {
    const { search = "", planName = "", status = "", billingCycle = "" } = req.query;
    const ownerFilter = { createdBy: req.user._id };
    const filter = { ...ownerFilter };
    if (planName) filter.planName = planName;
    if (status) filter.status = status;
    if (billingCycle) filter.billingCycle = billingCycle;
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ instituteName: regex }, { ownerName: regex }, { ownerPhone: regex }, { ownerEmail: regex }, { city: regex }, { internalTag: regex }];
    }

    const today = startOfToday();
    const soon = inDays(7);
    const [items, total, active, trials, pastDue, expiringSoon, expired, revenueAgg] = await Promise.all([
      Subscription.find(filter).sort({ updatedAt: -1 }).limit(300),
      Subscription.countDocuments(ownerFilter),
      Subscription.countDocuments({ ...ownerFilter, status: "active" }),
      Subscription.countDocuments({ ...ownerFilter, status: "trial" }),
      Subscription.countDocuments({ ...ownerFilter, status: "past_due" }),
      Subscription.countDocuments({ ...ownerFilter, status: { $in: ["active", "trial"] }, expiryDate: { $gte: today, $lte: soon } }),
      Subscription.countDocuments({ ...ownerFilter, expiryDate: { $lt: today } }),
      Subscription.aggregate([
        { $match: { ...ownerFilter, status: { $in: ["active", "trial", "past_due"] } } },
        { $group: { _id: null, base: { $sum: "$basePrice" }, discount: { $sum: "$discount" }, paid: { $sum: "$lastPaymentAmount" } } },
      ]),
    ]);

    const base = revenueAgg[0]?.base || 0;
    const discount = revenueAgg[0]?.discount || 0;
    res.json({
      success: true,
      totalSubscriptions: total,
      activeSubscriptions: active,
      trialSubscriptions: trials,
      pastDueSubscriptions: pastDue,
      expiringSoon,
      expiredSubscriptions: expired,
      estimatedMRR: Math.max(base - discount, 0),
      collectedAmount: revenueAgg[0]?.paid || 0,
      plans: planCatalog,
      addons: addonCatalog,
      subscriptions: items.map(toResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function createSubscription(req, res, next) {
  try {
    const payload = buildPayload(req.body);
    const subscription = await Subscription.create({ ...payload, createdBy: req.user._id });
    res.status(201).json({ success: true, message: "Subscription plan save ho gaya", subscription: toResponse(subscription) });
  } catch (error) {
    next(error);
  }
}

export async function getSubscriptionById(req, res, next) {
  try {
    const subscription = await Subscription.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!subscription) return res.status(404).json({ success: false, message: "Subscription record nahi mila" });
    res.json({ success: true, subscription: toResponse(subscription) });
  } catch (error) {
    next(error);
  }
}

export async function updateSubscription(req, res, next) {
  try {
    const existing = await Subscription.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!existing) return res.status(404).json({ success: false, message: "Subscription record nahi mila" });
    Object.assign(existing, buildPayload(req.body, existing));
    const saved = await existing.save();
    res.json({ success: true, message: "Subscription update ho gaya", subscription: toResponse(saved) });
  } catch (error) {
    next(error);
  }
}

export async function updateSubscriptionStatus(req, res, next) {
  try {
    const status = enumValue(req.body.status, ["trial", "active", "past_due", "paused", "cancelled", "expired"], "active");
    const subscription = await Subscription.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status },
      { new: true, runValidators: true }
    );
    if (!subscription) return res.status(404).json({ success: false, message: "Subscription record nahi mila" });
    res.json({ success: true, message: `Subscription status ${status} ho gaya`, subscription: toResponse(subscription) });
  } catch (error) {
    next(error);
  }
}

export async function updateSubscriptionAddon(req, res, next) {
  try {
    const key = enumValue(req.body.key, ["vani_ai", "whatsapp_sms", "advanced_reports", "extra_branch", "custom_branding"], "vani_ai");
    const subscription = await Subscription.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!subscription) return res.status(404).json({ success: false, message: "Subscription record nahi mila" });
    const catalog = addonCatalog[key] || addonCatalog.vani_ai;
    const index = subscription.addons.findIndex((addon) => addon.key === key);
    const billingCycle = enumValue(req.body.billingCycle, ["monthly", "yearly"], "monthly");
    const addon = {
      key,
      name: clean(req.body.name) || catalog.name,
      enabled: req.body.enabled !== false,
      billingCycle,
      price: numberValue(req.body.price, billingCycle === "yearly" ? (catalog.yearlyPrice || 0) : (catalog.monthlyPrice || 0)),
      usageCap: numberValue(req.body.usageCap, catalog.usageCap || 0),
      usedThisCycle: numberValue(req.body.usedThisCycle, 0),
      status: enumValue(req.body.status, ["active", "paused", "cancelled"], "active"),
    };
    if (index >= 0) subscription.addons[index] = addon;
    else subscription.addons.push(addon);
    const saved = await subscription.save();
    res.json({ success: true, message: `${addon.name} add-on update ho gaya`, subscription: toResponse(saved) });
  } catch (error) {
    next(error);
  }
}

export async function deleteSubscription(req, res, next) {
  try {
    const subscription = await Subscription.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!subscription) return res.status(404).json({ success: false, message: "Subscription record nahi mila" });
    res.json({ success: true, message: "Subscription delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
