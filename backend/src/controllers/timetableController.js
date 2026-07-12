import TimetableSlot from "../models/TimetableSlot.js";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function clean(value = "") {
  return String(value || "").trim();
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function timeToMinutes(value = "00:00") {
  const [hours = 0, minutes = 0] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
}

function duration(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return Math.max(0, end - start);
}

function dateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildPayload(body, user) {
  const startTime = clean(body.startTime);
  const endTime = clean(body.endTime);

  return {
    title: clean(body.title),
    timetableType: enumValue(body.timetableType, ["batch", "teacher", "student", "room", "exam", "event", "other"], "batch"),
    batchName: clean(body.batchName),
    courseName: clean(body.courseName),
    teacherName: clean(body.teacherName),
    subject: clean(body.subject),
    room: clean(body.room),
    dayOfWeek: enumValue(body.dayOfWeek, DAYS, "monday"),
    startTime,
    endTime,
    durationMinutes: duration(startTime, endTime) || Number(body.durationMinutes) || 60,
    classMode: enumValue(body.classMode, ["offline", "online", "hybrid"], "offline"),
    meetingLink: clean(body.meetingLink),
    priority: enumValue(body.priority, ["normal", "high", "urgent"], "normal"),
    status: enumValue(body.status, ["draft", "active", "cancelled", "completed"], "active"),
    recurringFrom: dateOrNull(body.recurringFrom),
    recurringTo: dateOrNull(body.recurringTo),
    notes: clean(body.notes),
    instituteName: user.instituteName || "NAXORA Institute",
    createdBy: user._id,
  };
}

function validatePayload(payload) {
  if (!payload.title) return "Class title required hai";
  if (!payload.subject) return "Subject required hai";
  if (!payload.startTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.startTime)) return "Start time HH:mm format me required hai";
  if (!payload.endTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.endTime)) return "End time HH:mm format me required hai";
  if (timeToMinutes(payload.endTime) <= timeToMinutes(payload.startTime)) return "End time start time ke baad hona chahiye";
  return "";
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);
}

async function findConflicts(payload, userId, excludeId = null) {
  const base = {
    createdBy: userId,
    dayOfWeek: payload.dayOfWeek,
    status: { $in: ["active", "draft"] },
  };
  if (excludeId) base._id = { $ne: excludeId };

  const possible = await TimetableSlot.find(base).limit(200);
  return possible.filter((slot) => {
    if (!overlaps(payload.startTime, payload.endTime, slot.startTime, slot.endTime)) return false;
    const sameTeacher = payload.teacherName && slot.teacherName && payload.teacherName.toLowerCase() === slot.teacherName.toLowerCase();
    const sameRoom = payload.room && slot.room && payload.room.toLowerCase() === slot.room.toLowerCase();
    const sameBatch = payload.batchName && slot.batchName && payload.batchName.toLowerCase() === slot.batchName.toLowerCase();
    return sameTeacher || sameRoom || sameBatch;
  });
}

function toResponse(slot) {
  return {
    id: slot._id,
    title: slot.title,
    timetableType: slot.timetableType,
    batchName: slot.batchName,
    courseName: slot.courseName,
    teacherName: slot.teacherName,
    subject: slot.subject,
    room: slot.room,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    durationMinutes: slot.durationMinutes,
    classMode: slot.classMode,
    meetingLink: slot.meetingLink,
    priority: slot.priority,
    status: slot.status,
    recurringFrom: slot.recurringFrom,
    recurringTo: slot.recurringTo,
    notes: slot.notes,
    instituteName: slot.instituteName,
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt,
  };
}

async function buildSummary(ownerFilter) {
  const [
    total,
    active,
    draft,
    cancelled,
    online,
    offline,
    urgent,
    batchesAgg,
    teachersAgg,
    roomsAgg,
  ] = await Promise.all([
    TimetableSlot.countDocuments(ownerFilter),
    TimetableSlot.countDocuments({ ...ownerFilter, status: "active" }),
    TimetableSlot.countDocuments({ ...ownerFilter, status: "draft" }),
    TimetableSlot.countDocuments({ ...ownerFilter, status: "cancelled" }),
    TimetableSlot.countDocuments({ ...ownerFilter, classMode: "online" }),
    TimetableSlot.countDocuments({ ...ownerFilter, classMode: "offline" }),
    TimetableSlot.countDocuments({ ...ownerFilter, priority: { $in: ["high", "urgent"] } }),
    TimetableSlot.aggregate([{ $match: ownerFilter }, { $group: { _id: "$batchName" } }, { $count: "total" }]),
    TimetableSlot.aggregate([{ $match: ownerFilter }, { $group: { _id: "$teacherName" } }, { $count: "total" }]),
    TimetableSlot.aggregate([{ $match: ownerFilter }, { $group: { _id: "$room" } }, { $count: "total" }]),
  ]);

  return {
    totalSlots: total,
    activeSlots: active,
    draftSlots: draft,
    cancelledSlots: cancelled,
    onlineSlots: online,
    offlineSlots: offline,
    prioritySlots: urgent,
    batchCount: batchesAgg[0]?.total || 0,
    teacherCount: teachersAgg[0]?.total || 0,
    roomCount: roomsAgg[0]?.total || 0,
  };
}

export async function createTimetableSlot(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const conflicts = await findConflicts(payload, req.user._id);
    const slot = await TimetableSlot.create(payload);

    res.status(201).json({
      success: true,
      message: conflicts.length ? "Timetable slot save ho gaya, lekin conflict warning hai" : "Timetable slot save ho gaya",
      conflictCount: conflicts.length,
      conflicts: conflicts.slice(0, 5).map(toResponse),
      slot: toResponse(slot),
    });
  } catch (error) {
    next(error);
  }
}

export async function getTimetableSlots(req, res, next) {
  try {
    const { search = "", status = "", dayOfWeek = "", teacherName = "", batchName = "", classMode = "", timetableType = "" } = req.query;
    const ownerFilter = { createdBy: req.user._id };
    const filter = { ...ownerFilter };

    if (status.trim()) filter.status = status.trim();
    if (dayOfWeek.trim()) filter.dayOfWeek = dayOfWeek.trim();
    if (teacherName.trim()) filter.teacherName = new RegExp(teacherName.trim(), "i");
    if (batchName.trim()) filter.batchName = new RegExp(batchName.trim(), "i");
    if (classMode.trim()) filter.classMode = classMode.trim();
    if (timetableType.trim()) filter.timetableType = timetableType.trim();

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { title: regex },
        { subject: regex },
        { batchName: regex },
        { courseName: regex },
        { teacherName: regex },
        { room: regex },
        { notes: regex },
      ];
    }

    const [slots, summary] = await Promise.all([
      TimetableSlot.find(filter).sort({ dayOfWeek: 1, startTime: 1, createdAt: -1 }).limit(200),
      buildSummary(ownerFilter),
    ]);

    res.json({ success: true, ...summary, days: DAYS, slots: slots.map(toResponse) });
  } catch (error) {
    next(error);
  }
}

export async function getTimetableSlotById(req, res, next) {
  try {
    const slot = await TimetableSlot.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!slot) return res.status(404).json({ success: false, message: "Timetable slot nahi mila" });
    res.json({ success: true, slot: toResponse(slot) });
  } catch (error) {
    next(error);
  }
}

export async function updateTimetableSlot(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const conflicts = await findConflicts(payload, req.user._id, req.params.id);
    const slot = await TimetableSlot.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );

    if (!slot) return res.status(404).json({ success: false, message: "Timetable slot nahi mila" });
    res.json({
      success: true,
      message: conflicts.length ? "Timetable update ho gaya, lekin conflict warning hai" : "Timetable update ho gaya",
      conflictCount: conflicts.length,
      conflicts: conflicts.slice(0, 5).map(toResponse),
      slot: toResponse(slot),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTimetableSlotStatus(req, res, next) {
  try {
    const status = enumValue(req.body.status, ["draft", "active", "cancelled", "completed"], "active");
    const slot = await TimetableSlot.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status },
      { new: true, runValidators: true }
    );

    if (!slot) return res.status(404).json({ success: false, message: "Timetable slot nahi mila" });
    res.json({ success: true, message: "Timetable status update ho gaya", slot: toResponse(slot) });
  } catch (error) {
    next(error);
  }
}

export async function deleteTimetableSlot(req, res, next) {
  try {
    const slot = await TimetableSlot.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!slot) return res.status(404).json({ success: false, message: "Timetable slot nahi mila" });
    res.json({ success: true, message: "Timetable slot delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
