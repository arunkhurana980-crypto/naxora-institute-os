import Batch from "../models/Batch.js";

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toBatchResponse(batch) {
  return {
    id: batch._id,
    name: batch.name,
    courseName: batch.courseName,
    teacherName: batch.teacherName,
    timing: batch.timing,
    days: batch.days,
    startDate: batch.startDate,
    endDate: batch.endDate,
    maxStudents: batch.maxStudents,
    enrolledStudents: batch.enrolledStudents,
    batchFees: batch.batchFees,
    status: batch.status,
    location: batch.location,
    notes: batch.notes,
    instituteName: batch.instituteName,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  };
}

function normalizePayload(body) {
  return {
    name: body.name?.trim(),
    courseName: body.courseName?.trim() || "",
    teacherName: body.teacherName?.trim() || "",
    timing: body.timing?.trim() || "",
    days: body.days?.trim() || "",
    startDate: dateValue(body.startDate),
    endDate: dateValue(body.endDate),
    maxStudents: Number(body.maxStudents || 0),
    enrolledStudents: Number(body.enrolledStudents || 0),
    batchFees: Number(body.batchFees || 0),
    status: body.status || "active",
    location: body.location?.trim() || "",
    notes: body.notes?.trim() || "",
  };
}

export async function createBatch(req, res, next) {
  try {
    const payload = normalizePayload(req.body);
    if (!payload.name) {
      return res.status(400).json({ success: false, message: "Batch name required hai" });
    }

    const batch = await Batch.create({
      ...payload,
      instituteName: req.user.instituteName || "NAXORA Institute",
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Batch successfully add ho gaya",
      batch: toBatchResponse(batch),
    });
  } catch (error) {
    next(error);
  }
}

export async function getBatches(req, res, next) {
  try {
    const { search = "", status = "" } = req.query;
    const owner = { createdBy: req.user._id };
    const filter = { ...owner };

    if (status) filter.status = status;
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { courseName: regex },
        { teacherName: regex },
        { timing: regex },
        { days: regex },
        { location: regex },
      ];
    }

    const [batches, total, active, upcoming, completed] = await Promise.all([
      Batch.find(filter).sort({ createdAt: -1 }),
      Batch.countDocuments(owner),
      Batch.countDocuments({ ...owner, status: "active" }),
      Batch.countDocuments({ ...owner, status: "upcoming" }),
      Batch.countDocuments({ ...owner, status: "completed" }),
    ]);

    res.json({
      success: true,
      count: batches.length,
      total,
      active,
      upcoming,
      completed,
      batches: batches.map(toBatchResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function getBatchById(req, res, next) {
  try {
    const batch = await Batch.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!batch) return res.status(404).json({ success: false, message: "Batch nahi mila" });
    res.json({ success: true, batch: toBatchResponse(batch) });
  } catch (error) {
    next(error);
  }
}

export async function updateBatch(req, res, next) {
  try {
    const payload = normalizePayload(req.body);
    if (!payload.name) {
      return res.status(400).json({ success: false, message: "Batch name required hai" });
    }

    const batch = await Batch.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );

    if (!batch) return res.status(404).json({ success: false, message: "Batch nahi mila" });

    res.json({
      success: true,
      message: "Batch update ho gaya",
      batch: toBatchResponse(batch),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteBatch(req, res, next) {
  try {
    const batch = await Batch.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!batch) return res.status(404).json({ success: false, message: "Batch nahi mila" });
    res.json({ success: true, message: "Batch delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
