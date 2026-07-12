import Assignment from "../models/Assignment.js";

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

function parseSubmissions(raw = "") {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => ({
        studentName: clean(item.studentName),
        status: enumValue(item.status, ["pending", "submitted", "checked"], "pending"),
        marks: numberValue(item.marks, 0),
        remarks: clean(item.remarks),
        submittedAt: item.submittedAt ? new Date(item.submittedAt) : undefined,
        checkedAt: item.checkedAt ? new Date(item.checkedAt) : undefined,
      }))
      .filter((item) => item.studentName);
  }

  return clean(raw)
    .split("\n")
    .map((line) => clean(line))
    .filter(Boolean)
    .map((studentName) => ({ studentName, status: "pending", marks: 0, remarks: "" }));
}

function buildPayload(body, user) {
  const assignedTo = enumValue(body.assignedTo, ["batch", "student"], "batch");
  const submissionStatus = enumValue(body.submissionStatus, ["pending", "submitted", "checked"], "pending");
  const dueDate = body.dueDate ? new Date(body.dueDate) : null;

  return {
    title: clean(body.title),
    description: clean(body.description),
    subject: clean(body.subject),
    topic: clean(body.topic),
    batchName: clean(body.batchName),
    assignedTo,
    studentName: assignedTo === "student" ? clean(body.studentName) : clean(body.studentName),
    teacherName: clean(body.teacherName),
    dueDate,
    maxMarks: numberValue(body.maxMarks, 100),
    priority: enumValue(body.priority, ["low", "normal", "high"], "normal"),
    status: enumValue(body.status, ["draft", "active", "closed"], "active"),
    submissionStatus,
    teacherRemarks: clean(body.teacherRemarks),
    resourceLink: clean(body.resourceLink),
    submissions: parseSubmissions(body.submissionsText || body.submissions || body.studentNames),
    instituteName: user.instituteName || "NAXORA Institute",
    createdBy: user._id,
  };
}

function validatePayload(payload) {
  if (!payload.title) return "Assignment title required hai";
  if (!payload.description) return "Assignment description required hai";
  if (!payload.subject) return "Subject required hai";
  if (!payload.batchName) return "Batch name required hai";
  if (payload.assignedTo === "student" && !payload.studentName) return "Specific student assignment ke liye student name required hai";
  if (!payload.dueDate || Number.isNaN(payload.dueDate.getTime())) return "Valid due date required hai";
  return "";
}

function toAssignmentResponse(item) {
  return {
    id: item._id,
    title: item.title,
    description: item.description,
    subject: item.subject,
    topic: item.topic,
    batchName: item.batchName,
    assignedTo: item.assignedTo,
    studentName: item.studentName,
    teacherName: item.teacherName,
    dueDate: item.dueDate,
    maxMarks: item.maxMarks,
    priority: item.priority,
    status: item.status,
    submissionStatus: item.submissionStatus,
    teacherRemarks: item.teacherRemarks,
    resourceLink: item.resourceLink,
    submissions: item.submissions || [],
    submissionCount: item.submissions?.length || 0,
    submittedCount: item.submissions?.filter((s) => s.status === "submitted" || s.status === "checked").length || 0,
    checkedCount: item.submissions?.filter((s) => s.status === "checked").length || 0,
    instituteName: item.instituteName,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function createAssignment(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const validationError = validatePayload(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const assignment = await Assignment.create(payload);
    res.status(201).json({ success: true, message: "Assignment/Homework add ho gaya", assignment: toAssignmentResponse(assignment) });
  } catch (error) {
    next(error);
  }
}

export async function getAssignments(req, res, next) {
  try {
    const { search = "", subject = "", status = "", submissionStatus = "", priority = "" } = req.query;
    const owner = { createdBy: req.user._id };
    const filter = { ...owner };

    if (subject.trim()) filter.subject = new RegExp(subject.trim(), "i");
    if (status.trim()) filter.status = status.trim();
    if (submissionStatus.trim()) filter.submissionStatus = submissionStatus.trim();
    if (priority.trim()) filter.priority = priority.trim();

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { title: regex },
        { description: regex },
        { subject: regex },
        { topic: regex },
        { batchName: regex },
        { studentName: regex },
        { teacherName: regex },
        { teacherRemarks: regex },
      ];
    }

    const assignments = await Assignment.find(filter).sort({ dueDate: 1, createdAt: -1 }).limit(120);
    const all = await Assignment.find(owner).select("status submissionStatus subject priority submissions dueDate");

    const now = new Date();
    const summary = all.reduce(
      (acc, item) => {
        acc.totalAssignments += 1;
        if (item.status === "active") acc.activeAssignments += 1;
        if (item.status === "draft") acc.draftAssignments += 1;
        if (item.status === "closed") acc.closedAssignments += 1;
        if (item.submissionStatus === "pending") acc.pendingAssignments += 1;
        if (item.submissionStatus === "submitted") acc.submittedAssignments += 1;
        if (item.submissionStatus === "checked") acc.checkedAssignments += 1;
        if (item.dueDate && item.dueDate < now && item.status !== "closed" && item.submissionStatus !== "checked") acc.overdueAssignments += 1;
        acc.subjects.add(item.subject);
        acc.totalSubmissionRows += item.submissions?.length || 0;
        acc.checkedSubmissionRows += item.submissions?.filter((s) => s.status === "checked").length || 0;
        return acc;
      },
      {
        totalAssignments: 0,
        activeAssignments: 0,
        draftAssignments: 0,
        closedAssignments: 0,
        pendingAssignments: 0,
        submittedAssignments: 0,
        checkedAssignments: 0,
        overdueAssignments: 0,
        subjects: new Set(),
        totalSubmissionRows: 0,
        checkedSubmissionRows: 0,
      }
    );

    res.json({
      success: true,
      count: assignments.length,
      totalAssignments: summary.totalAssignments,
      activeAssignments: summary.activeAssignments,
      draftAssignments: summary.draftAssignments,
      closedAssignments: summary.closedAssignments,
      pendingAssignments: summary.pendingAssignments,
      submittedAssignments: summary.submittedAssignments,
      checkedAssignments: summary.checkedAssignments,
      overdueAssignments: summary.overdueAssignments,
      subjectCount: summary.subjects.size,
      totalSubmissionRows: summary.totalSubmissionRows,
      checkedSubmissionRows: summary.checkedSubmissionRows,
      assignments: assignments.map(toAssignmentResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function getAssignmentById(req, res, next) {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!assignment) return res.status(404).json({ success: false, message: "Assignment nahi mila" });
    res.json({ success: true, assignment: toAssignmentResponse(assignment) });
  } catch (error) {
    next(error);
  }
}

export async function updateAssignment(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    delete payload.createdBy;
    const validationError = validatePayload(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const assignment = await Assignment.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );

    if (!assignment) return res.status(404).json({ success: false, message: "Assignment nahi mila" });
    res.json({ success: true, message: "Assignment update ho gaya", assignment: toAssignmentResponse(assignment) });
  } catch (error) {
    next(error);
  }
}

export async function updateAssignmentStatus(req, res, next) {
  try {
    const submissionStatus = enumValue(req.body.submissionStatus, ["pending", "submitted", "checked"], "pending");
    const status = req.body.status ? enumValue(req.body.status, ["draft", "active", "closed"], "active") : undefined;
    const teacherRemarks = clean(req.body.teacherRemarks);

    const update = { submissionStatus };
    if (status) update.status = status;
    if (teacherRemarks) update.teacherRemarks = teacherRemarks;

    const assignment = await Assignment.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      update,
      { new: true, runValidators: true }
    );

    if (!assignment) return res.status(404).json({ success: false, message: "Assignment nahi mila" });
    res.json({ success: true, message: "Submission status update ho gaya", assignment: toAssignmentResponse(assignment) });
  } catch (error) {
    next(error);
  }
}

export async function deleteAssignment(req, res, next) {
  try {
    const assignment = await Assignment.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!assignment) return res.status(404).json({ success: false, message: "Assignment nahi mila" });
    res.json({ success: true, message: "Assignment delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
