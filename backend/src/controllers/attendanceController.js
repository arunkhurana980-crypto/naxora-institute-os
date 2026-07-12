import Attendance from "../models/Attendance.js";

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function normalizeRecords(records = []) {
  if (!Array.isArray(records)) return [];
  return records
    .map((record) => ({
      studentName: record.studentName?.trim() || "",
      phone: record.phone?.trim() || "",
      status: ["present", "absent", "late", "leave"].includes(record.status) ? record.status : "present",
      remarks: record.remarks?.trim() || "",
    }))
    .filter((record) => record.studentName.length > 0);
}

function countRecords(records) {
  const counts = {
    totalStudents: records.length,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    leaveCount: 0,
  };

  for (const record of records) {
    if (record.status === "present") counts.presentCount += 1;
    if (record.status === "absent") counts.absentCount += 1;
    if (record.status === "late") counts.lateCount += 1;
    if (record.status === "leave") counts.leaveCount += 1;
  }

  return counts;
}

function normalizePayload(body) {
  const records = normalizeRecords(body.records);
  const counts = countRecords(records);

  return {
    batchName: body.batchName?.trim(),
    courseName: body.courseName?.trim() || "",
    teacherName: body.teacherName?.trim() || "",
    attendanceDate: dateValue(body.attendanceDate),
    classTiming: body.classTiming?.trim() || "",
    topicCovered: body.topicCovered?.trim() || "",
    sessionStatus: body.sessionStatus || "completed",
    records,
    ...counts,
    notes: body.notes?.trim() || "",
  };
}

function percentage(session) {
  const total = Number(session.totalStudents || 0);
  if (!total) return 0;
  return Math.round(((Number(session.presentCount || 0) + Number(session.lateCount || 0)) / total) * 100);
}

function toAttendanceResponse(session) {
  return {
    id: session._id,
    batchName: session.batchName,
    courseName: session.courseName,
    teacherName: session.teacherName,
    attendanceDate: session.attendanceDate,
    classTiming: session.classTiming,
    topicCovered: session.topicCovered,
    sessionStatus: session.sessionStatus,
    records: session.records,
    totalStudents: session.totalStudents,
    presentCount: session.presentCount,
    absentCount: session.absentCount,
    lateCount: session.lateCount,
    leaveCount: session.leaveCount,
    attendancePercentage: percentage(session),
    notes: session.notes,
    instituteName: session.instituteName,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export async function createAttendance(req, res, next) {
  try {
    const payload = normalizePayload(req.body);

    if (!payload.batchName) {
      return res.status(400).json({ success: false, message: "Batch name required hai" });
    }
    if (!payload.attendanceDate) {
      return res.status(400).json({ success: false, message: "Attendance date required hai" });
    }
    if (!payload.records.length) {
      return res.status(400).json({ success: false, message: "Kam se kam 1 student ka attendance add karo" });
    }

    const session = await Attendance.create({
      ...payload,
      instituteName: req.user.instituteName || "NAXORA Institute",
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Attendance successfully save ho gayi",
      attendance: toAttendanceResponse(session),
    });
  } catch (error) {
    next(error);
  }
}

export async function getAttendanceSessions(req, res, next) {
  try {
    const { search = "", batchName = "", date = "", status = "" } = req.query;
    const owner = { createdBy: req.user._id };
    const filter = { ...owner };

    if (batchName.trim()) filter.batchName = new RegExp(batchName.trim(), "i");
    if (date) {
      const pickedDate = dateValue(date);
      if (pickedDate) filter.attendanceDate = { $gte: startOfDay(pickedDate), $lte: endOfDay(pickedDate) };
    }
    if (status) filter["records.status"] = status;
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { batchName: regex },
        { courseName: regex },
        { teacherName: regex },
        { topicCovered: regex },
        { classTiming: regex },
        { "records.studentName": regex },
        { "records.phone": regex },
      ];
    }

    const sessions = await Attendance.find(filter).sort({ attendanceDate: -1, createdAt: -1 }).limit(80);
    const allSessions = await Attendance.find(owner).select("totalStudents presentCount absentCount lateCount leaveCount attendanceDate");

    const summary = allSessions.reduce(
      (acc, session) => {
        acc.totalSessions += 1;
        acc.totalStudents += session.totalStudents || 0;
        acc.present += session.presentCount || 0;
        acc.absent += session.absentCount || 0;
        acc.late += session.lateCount || 0;
        acc.leave += session.leaveCount || 0;
        return acc;
      },
      { totalSessions: 0, totalStudents: 0, present: 0, absent: 0, late: 0, leave: 0 }
    );

    summary.percentage = summary.totalStudents
      ? Math.round(((summary.present + summary.late) / summary.totalStudents) * 100)
      : 0;

    res.json({
      success: true,
      count: sessions.length,
      ...summary,
      attendance: sessions.map(toAttendanceResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function getAttendanceById(req, res, next) {
  try {
    const session = await Attendance.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: "Attendance record nahi mila" });
    res.json({ success: true, attendance: toAttendanceResponse(session) });
  } catch (error) {
    next(error);
  }
}

export async function updateAttendance(req, res, next) {
  try {
    const payload = normalizePayload(req.body);

    if (!payload.batchName) {
      return res.status(400).json({ success: false, message: "Batch name required hai" });
    }
    if (!payload.attendanceDate) {
      return res.status(400).json({ success: false, message: "Attendance date required hai" });
    }
    if (!payload.records.length) {
      return res.status(400).json({ success: false, message: "Kam se kam 1 student ka attendance add karo" });
    }

    const session = await Attendance.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );

    if (!session) return res.status(404).json({ success: false, message: "Attendance record nahi mila" });

    res.json({
      success: true,
      message: "Attendance update ho gayi",
      attendance: toAttendanceResponse(session),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAttendance(req, res, next) {
  try {
    const session = await Attendance.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: "Attendance record nahi mila" });
    res.json({ success: true, message: "Attendance delete ho gayi" });
  } catch (error) {
    next(error);
  }
}
