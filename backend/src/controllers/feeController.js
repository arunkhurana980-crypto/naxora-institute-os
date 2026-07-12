import Fee from "../models/Fee.js";

function numberValue(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function statusValue(status, totalAmount, paidAmount, discount, dueDate) {
  const pendingAmount = Math.max(totalAmount - paidAmount - discount, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (pendingAmount <= 0) return "paid";
  if (paidAmount > 0) return "partial";
  if (dueDate && dueDate < today) return "overdue";
  if (["paid", "pending", "partial", "overdue"].includes(status)) return status;
  return "pending";
}

function normalizePayload(body) {
  const totalAmount = numberValue(body.totalAmount);
  const paidAmount = numberValue(body.paidAmount);
  const discount = numberValue(body.discount);
  const dueDate = dateValue(body.dueDate);
  const paymentDate = dateValue(body.paymentDate);
  const pendingAmount = Math.max(totalAmount - paidAmount - discount, 0);
  const paymentMode = ["cash", "upi", "bank", "card", "other"].includes(body.paymentMode)
    ? body.paymentMode
    : "cash";

  return {
    studentName: body.studentName?.trim(),
    phone: body.phone?.trim() || "",
    courseName: body.courseName?.trim() || "",
    batchName: body.batchName?.trim() || "",
    month: body.month?.trim(),
    dueDate,
    totalAmount,
    paidAmount,
    discount,
    pendingAmount,
    status: statusValue(body.status, totalAmount, paidAmount, discount, dueDate),
    paymentMode,
    paymentDate,
    receiptNo: body.receiptNo?.trim() || "",
    notes: body.notes?.trim() || "",
  };
}

function toFeeResponse(fee) {
  return {
    id: fee._id,
    studentName: fee.studentName,
    phone: fee.phone,
    courseName: fee.courseName,
    batchName: fee.batchName,
    month: fee.month,
    dueDate: fee.dueDate,
    totalAmount: fee.totalAmount,
    paidAmount: fee.paidAmount,
    discount: fee.discount,
    pendingAmount: fee.pendingAmount,
    status: fee.status,
    paymentMode: fee.paymentMode,
    paymentDate: fee.paymentDate,
    receiptNo: fee.receiptNo,
    notes: fee.notes,
    instituteName: fee.instituteName,
    createdAt: fee.createdAt,
    updatedAt: fee.updatedAt,
  };
}

function money(amount) {
  return Number(amount || 0);
}

export async function createFee(req, res, next) {
  try {
    const payload = normalizePayload(req.body);

    if (!payload.studentName) {
      return res.status(400).json({ success: false, message: "Student name required hai" });
    }
    if (!payload.month) {
      return res.status(400).json({ success: false, message: "Fees month required hai" });
    }
    if (payload.totalAmount <= 0) {
      return res.status(400).json({ success: false, message: "Total amount 0 se zyada hona chahiye" });
    }
    if (payload.paidAmount + payload.discount > payload.totalAmount) {
      return res.status(400).json({ success: false, message: "Paid amount + discount total fees se zyada nahi ho sakta" });
    }

    const fee = await Fee.create({
      ...payload,
      instituteName: req.user.instituteName || "NAXORA Institute",
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Fee record successfully save ho gaya",
      fee: toFeeResponse(fee),
    });
  } catch (error) {
    next(error);
  }
}

export async function getFees(req, res, next) {
  try {
    const { search = "", status = "", mode = "", month = "" } = req.query;
    const owner = { createdBy: req.user._id };
    const filter = { ...owner };

    if (status.trim()) filter.status = status.trim();
    if (mode.trim()) filter.paymentMode = mode.trim();
    if (month.trim()) filter.month = new RegExp(month.trim(), "i");

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { studentName: regex },
        { phone: regex },
        { courseName: regex },
        { batchName: regex },
        { month: regex },
        { receiptNo: regex },
      ];
    }

    const fees = await Fee.find(filter).sort({ dueDate: -1, createdAt: -1 }).limit(100);
    const allFees = await Fee.find(owner).select("totalAmount paidAmount discount pendingAmount status paymentMode");

    const summary = allFees.reduce(
      (acc, fee) => {
        acc.totalRecords += 1;
        acc.totalFees += money(fee.totalAmount);
        acc.paidFees += money(fee.paidAmount);
        acc.discount += money(fee.discount);
        acc.pendingFees += money(fee.pendingAmount);
        if (fee.status === "paid") acc.paidRecords += 1;
        if (fee.status === "pending") acc.pendingRecords += 1;
        if (fee.status === "partial") acc.partialRecords += 1;
        if (fee.status === "overdue") acc.overdueRecords += 1;
        return acc;
      },
      {
        totalRecords: 0,
        totalFees: 0,
        paidFees: 0,
        discount: 0,
        pendingFees: 0,
        paidRecords: 0,
        pendingRecords: 0,
        partialRecords: 0,
        overdueRecords: 0,
      }
    );

    res.json({
      success: true,
      count: fees.length,
      ...summary,
      fees: fees.map(toFeeResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function getFeeById(req, res, next) {
  try {
    const fee = await Fee.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!fee) return res.status(404).json({ success: false, message: "Fee record nahi mila" });
    res.json({ success: true, fee: toFeeResponse(fee) });
  } catch (error) {
    next(error);
  }
}

export async function updateFee(req, res, next) {
  try {
    const payload = normalizePayload(req.body);

    if (!payload.studentName) {
      return res.status(400).json({ success: false, message: "Student name required hai" });
    }
    if (!payload.month) {
      return res.status(400).json({ success: false, message: "Fees month required hai" });
    }
    if (payload.totalAmount <= 0) {
      return res.status(400).json({ success: false, message: "Total amount 0 se zyada hona chahiye" });
    }
    if (payload.paidAmount + payload.discount > payload.totalAmount) {
      return res.status(400).json({ success: false, message: "Paid amount + discount total fees se zyada nahi ho sakta" });
    }

    const fee = await Fee.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );

    if (!fee) return res.status(404).json({ success: false, message: "Fee record nahi mila" });

    res.json({
      success: true,
      message: "Fee record update ho gaya",
      fee: toFeeResponse(fee),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteFee(req, res, next) {
  try {
    const fee = await Fee.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!fee) return res.status(404).json({ success: false, message: "Fee record nahi mila" });
    res.json({ success: true, message: "Fee record delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
