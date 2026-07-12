import FinanceRecord from "../models/FinanceRecord.js";

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
    recordType: enumValue(body.recordType, ["income", "expense"], "income"),
    title: clean(body.title),
    category: enumValue(
      body.category,
      [
        "fees",
        "admission",
        "salary",
        "rent",
        "electricity",
        "internet",
        "marketing",
        "software",
        "stationery",
        "equipment",
        "maintenance",
        "refund",
        "other",
      ],
      "other"
    ),
    amount: numberValue(body.amount),
    paymentMode: enumValue(body.paymentMode, ["cash", "upi", "bank", "card", "other"], "cash"),
    transactionDate: dateValue(body.transactionDate),
    month: clean(body.month),
    paidToOrFrom: clean(body.paidToOrFrom),
    referenceNo: clean(body.referenceNo),
    status: enumValue(body.status, ["completed", "pending", "cancelled"], "completed"),
    recurring: Boolean(body.recurring),
    note: clean(body.note),
    createdBy: user._id,
  };
}

function validatePayload(payload) {
  if (!payload.title) return "Record title required hai";
  if (!payload.amount || payload.amount <= 0) return "Amount 0 se zyada hona chahiye";
  return "";
}

function toResponse(record) {
  return {
    id: record._id,
    recordType: record.recordType,
    title: record.title,
    category: record.category,
    amount: record.amount,
    paymentMode: record.paymentMode,
    transactionDate: record.transactionDate,
    month: record.month,
    paidToOrFrom: record.paidToOrFrom,
    referenceNo: record.referenceNo,
    status: record.status,
    recurring: record.recurring,
    note: record.note,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function buildSummary(ownerFilter) {
  const all = await FinanceRecord.find(ownerFilter).select("recordType amount status category paymentMode transactionDate month");
  return all.reduce(
    (acc, record) => {
      const amount = Number(record.amount || 0);
      if (record.status === "completed") {
        if (record.recordType === "income") acc.totalIncome += amount;
        if (record.recordType === "expense") acc.totalExpense += amount;
      }
      if (record.status === "pending") acc.pendingAmount += amount;
      if (record.status === "cancelled") acc.cancelledRecords += 1;
      acc.totalRecords += 1;
      acc[record.recordType] = (acc[record.recordType] || 0) + 1;
      acc[record.status] = (acc[record.status] || 0) + 1;
      acc.categories[record.category] = (acc.categories[record.category] || 0) + amount;
      acc.paymentModes[record.paymentMode] = (acc.paymentModes[record.paymentMode] || 0) + amount;
      return acc;
    },
    {
      totalRecords: 0,
      income: 0,
      expense: 0,
      completed: 0,
      pending: 0,
      cancelled: 0,
      cancelledRecords: 0,
      totalIncome: 0,
      totalExpense: 0,
      pendingAmount: 0,
      categories: {},
      paymentModes: {},
    }
  );
}

export async function createFinanceRecord(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });
    const record = await FinanceRecord.create(payload);
    res.status(201).json({ success: true, message: "Finance record save ho gaya", record: toResponse(record) });
  } catch (error) {
    next(error);
  }
}

export async function getFinanceRecords(req, res, next) {
  try {
    const { search = "", type = "", category = "", status = "", mode = "", month = "" } = req.query;
    const ownerFilter = { createdBy: req.user._id };
    const filter = { ...ownerFilter };

    if (type.trim()) filter.recordType = type.trim();
    if (category.trim()) filter.category = category.trim();
    if (status.trim()) filter.status = status.trim();
    if (mode.trim()) filter.paymentMode = mode.trim();
    if (month.trim()) filter.month = new RegExp(month.trim(), "i");

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { title: regex },
        { paidToOrFrom: regex },
        { referenceNo: regex },
        { month: regex },
        { note: regex },
      ];
    }

    const records = await FinanceRecord.find(filter).sort({ transactionDate: -1, createdAt: -1 }).limit(220);
    const summary = await buildSummary(ownerFilter);
    const profit = summary.totalIncome - summary.totalExpense;

    res.json({
      success: true,
      count: records.length,
      totalRecords: summary.totalRecords,
      incomeRecords: summary.income,
      expenseRecords: summary.expense,
      completedRecords: summary.completed,
      pendingRecords: summary.pending,
      cancelledRecords: summary.cancelledRecords,
      totalIncome: summary.totalIncome,
      totalExpense: summary.totalExpense,
      netProfit: profit,
      pendingAmount: summary.pendingAmount,
      categorySummary: summary.categories,
      paymentModeSummary: summary.paymentModes,
      records: records.map(toResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function getFinanceRecordById(req, res, next) {
  try {
    const record = await FinanceRecord.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!record) return res.status(404).json({ success: false, message: "Finance record nahi mila" });
    res.json({ success: true, record: toResponse(record) });
  } catch (error) {
    next(error);
  }
}

export async function updateFinanceRecord(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    delete payload.createdBy;
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const record = await FinanceRecord.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );
    if (!record) return res.status(404).json({ success: false, message: "Finance record nahi mila" });
    res.json({ success: true, message: "Finance record update ho gaya", record: toResponse(record) });
  } catch (error) {
    next(error);
  }
}

export async function updateFinanceStatus(req, res, next) {
  try {
    const status = enumValue(req.body.status, ["completed", "pending", "cancelled"], "completed");
    const record = await FinanceRecord.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status },
      { new: true, runValidators: true }
    );
    if (!record) return res.status(404).json({ success: false, message: "Finance record nahi mila" });
    res.json({ success: true, message: `Status ${status} ho gaya`, record: toResponse(record) });
  } catch (error) {
    next(error);
  }
}

export async function deleteFinanceRecord(req, res, next) {
  try {
    const record = await FinanceRecord.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!record) return res.status(404).json({ success: false, message: "Finance record nahi mila" });
    res.json({ success: true, message: "Finance record delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
