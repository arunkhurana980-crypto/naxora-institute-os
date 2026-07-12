import Progress from "../models/Progress.js";

function clean(value = "") {
  return String(value || "").trim();
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function numberValue(value, fallback = 0, min = 0, max = 100) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildSubjectProgress(rows = []) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return safeRows
    .map((row) => ({
      subject: clean(row.subject),
      currentScore: numberValue(row.currentScore, 0),
      previousScore: numberValue(row.previousScore, 0),
      attendancePercent: numberValue(row.attendancePercent, 0),
      homeworkCompletion: numberValue(row.homeworkCompletion, 0),
      testPerformance: numberValue(row.testPerformance, 0),
      status: enumValue(row.status, ["excellent", "good", "improving", "needs_attention", "critical"], "improving"),
      weakAreas: clean(row.weakAreas),
      improvementPlan: clean(row.improvementPlan),
    }))
    .filter((row) => row.subject);
}

function averageFromSubjects(subjectRows) {
  if (!subjectRows.length) return 0;
  const total = subjectRows.reduce((sum, row) => sum + Number(row.currentScore || 0), 0);
  return Math.round(total / subjectRows.length);
}

function autoStatus(score, fallback = "improving") {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "improving";
  if (score >= 35) return "needs_attention";
  if (score > 0) return "critical";
  return fallback;
}

function buildPayload(body, user) {
  const subjectProgress = buildSubjectProgress(body.subjectProgress);
  const overallScore = body.overallScore === "" || body.overallScore === undefined
    ? averageFromSubjects(subjectProgress)
    : numberValue(body.overallScore, averageFromSubjects(subjectProgress));

  return {
    studentName: clean(body.studentName),
    rollNo: clean(body.rollNo),
    courseName: clean(body.courseName),
    batchName: clean(body.batchName),
    classLevel: clean(body.classLevel),
    reportMonth: clean(body.reportMonth),
    mentorName: clean(body.mentorName),
    overallScore,
    improvementPercent: numberValue(body.improvementPercent, 0, -100, 100),
    overallStatus: enumValue(body.overallStatus, ["excellent", "good", "improving", "needs_attention", "critical"], autoStatus(overallScore)),
    subjectProgress,
    strengths: clean(body.strengths),
    weakAreas: clean(body.weakAreas),
    improvementPlan: clean(body.improvementPlan),
    teacherNotes: clean(body.teacherNotes),
    parentMeetingNotes: clean(body.parentMeetingNotes),
    nextReviewDate: dateValue(body.nextReviewDate),
    reportStatus: enumValue(body.reportStatus, ["draft", "shared", "reviewed", "archived"], "draft"),
    status: enumValue(body.status, ["active", "archived"], "active"),
    instituteName: user.instituteName || "NAXORA Institute",
    createdBy: user._id,
  };
}

function validatePayload(payload) {
  if (!payload.studentName) return "Student name required hai";
  if (payload.studentName.length < 2) return "Student name minimum 2 characters ka hona chahiye";
  if (!payload.courseName && !payload.batchName) return "Course ya batch me se ek required hai";
  if (!payload.subjectProgress.length) return "Kam se kam ek subject progress row add karo";
  return "";
}

function toResponse(progress) {
  return {
    id: progress._id,
    studentName: progress.studentName,
    rollNo: progress.rollNo,
    courseName: progress.courseName,
    batchName: progress.batchName,
    classLevel: progress.classLevel,
    reportMonth: progress.reportMonth,
    mentorName: progress.mentorName,
    overallScore: progress.overallScore,
    improvementPercent: progress.improvementPercent,
    overallStatus: progress.overallStatus,
    subjectProgress: progress.subjectProgress || [],
    strengths: progress.strengths,
    weakAreas: progress.weakAreas,
    improvementPlan: progress.improvementPlan,
    teacherNotes: progress.teacherNotes,
    parentMeetingNotes: progress.parentMeetingNotes,
    nextReviewDate: progress.nextReviewDate,
    reportStatus: progress.reportStatus,
    status: progress.status,
    instituteName: progress.instituteName,
    createdAt: progress.createdAt,
    updatedAt: progress.updatedAt,
  };
}

async function buildSummary(ownerFilter) {
  const [total, excellent, good, improving, needsAttention, shared, avgScoreAgg, avgImprovementAgg] = await Promise.all([
    Progress.countDocuments(ownerFilter),
    Progress.countDocuments({ ...ownerFilter, overallStatus: "excellent" }),
    Progress.countDocuments({ ...ownerFilter, overallStatus: "good" }),
    Progress.countDocuments({ ...ownerFilter, overallStatus: "improving" }),
    Progress.countDocuments({ ...ownerFilter, overallStatus: { $in: ["needs_attention", "critical"] } }),
    Progress.countDocuments({ ...ownerFilter, reportStatus: { $in: ["shared", "reviewed"] } }),
    Progress.aggregate([{ $match: ownerFilter }, { $group: { _id: null, avg: { $avg: "$overallScore" } } }]),
    Progress.aggregate([{ $match: ownerFilter }, { $group: { _id: null, avg: { $avg: "$improvementPercent" } } }]),
  ]);

  return {
    total,
    excellent,
    good,
    improving,
    needsAttention,
    shared,
    avgScore: Math.round(avgScoreAgg[0]?.avg || 0),
    avgImprovement: Math.round(avgImprovementAgg[0]?.avg || 0),
  };
}

export async function createProgress(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const progress = await Progress.create(payload);
    res.status(201).json({ success: true, message: "Student progress report save ho gaya", progress: toResponse(progress) });
  } catch (error) {
    next(error);
  }
}

export async function getProgressReports(req, res, next) {
  try {
    const { search = "", status = "", overallStatus = "", reportStatus = "", batchName = "", courseName = "" } = req.query;
    const ownerFilter = { createdBy: req.user._id };
    const filter = { ...ownerFilter };

    if (status.trim()) filter.status = status.trim();
    if (overallStatus.trim()) filter.overallStatus = overallStatus.trim();
    if (reportStatus.trim()) filter.reportStatus = reportStatus.trim();
    if (batchName.trim()) filter.batchName = new RegExp(batchName.trim(), "i");
    if (courseName.trim()) filter.courseName = new RegExp(courseName.trim(), "i");

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { studentName: regex },
        { rollNo: regex },
        { courseName: regex },
        { batchName: regex },
        { classLevel: regex },
        { reportMonth: regex },
        { mentorName: regex },
        { strengths: regex },
        { weakAreas: regex },
        { improvementPlan: regex },
        { "subjectProgress.subject": regex },
      ];
    }

    const progressReports = await Progress.find(filter).sort({ updatedAt: -1 }).limit(250);
    const summary = await buildSummary(ownerFilter);
    res.json({ success: true, count: progressReports.length, ...summary, progressReports: progressReports.map(toResponse) });
  } catch (error) {
    next(error);
  }
}

export async function getProgressById(req, res, next) {
  try {
    const progress = await Progress.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!progress) return res.status(404).json({ success: false, message: "Progress report nahi mila" });
    res.json({ success: true, progress: toResponse(progress) });
  } catch (error) {
    next(error);
  }
}

export async function updateProgress(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    delete payload.createdBy;
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const progress = await Progress.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );
    if (!progress) return res.status(404).json({ success: false, message: "Progress report nahi mila" });
    res.json({ success: true, message: "Progress report update ho gaya", progress: toResponse(progress) });
  } catch (error) {
    next(error);
  }
}

export async function updateProgressStatus(req, res, next) {
  try {
    const payload = {};
    if (req.body.status) payload.status = enumValue(req.body.status, ["active", "archived"], "active");
    if (req.body.reportStatus) payload.reportStatus = enumValue(req.body.reportStatus, ["draft", "shared", "reviewed", "archived"], "draft");
    if (req.body.overallStatus) payload.overallStatus = enumValue(req.body.overallStatus, ["excellent", "good", "improving", "needs_attention", "critical"], "improving");
    if (req.body.nextReviewDate !== undefined) payload.nextReviewDate = dateValue(req.body.nextReviewDate);

    const progress = await Progress.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );
    if (!progress) return res.status(404).json({ success: false, message: "Progress report nahi mila" });
    res.json({ success: true, message: "Progress status update ho gaya", progress: toResponse(progress) });
  } catch (error) {
    next(error);
  }
}

export async function deleteProgress(req, res, next) {
  try {
    const progress = await Progress.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!progress) return res.status(404).json({ success: false, message: "Progress report nahi mila" });
    res.json({ success: true, message: "Progress report delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
