import TestResult from "../models/TestResult.js";

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

function gradeFromPercent(percent) {
  if (percent >= 90) return "A+";
  if (percent >= 75) return "A";
  if (percent >= 60) return "B";
  if (percent >= 45) return "C";
  if (percent >= 33) return "D";
  return "F";
}

function normalizeResultRow(row, totalMarks, passingMarks) {
  const studentName = clean(row.studentName);
  const status = enumValue(row.resultStatus, ["pending", "pass", "fail", "absent"], "pending");
  const marksObtained = Math.min(numberValue(row.marksObtained, 0), Math.max(totalMarks, 0));
  const percent = totalMarks ? Math.round((marksObtained / totalMarks) * 100) : 0;
  let resultStatus = status;

  if (resultStatus === "pending" && row.marksObtained !== "" && row.marksObtained !== undefined && row.marksObtained !== null) {
    resultStatus = marksObtained >= passingMarks ? "pass" : "fail";
  }

  return {
    studentName,
    rollNo: clean(row.rollNo),
    marksObtained,
    grade: clean(row.grade) || gradeFromPercent(percent),
    rank: numberValue(row.rank, 0),
    resultStatus,
    remarks: clean(row.remarks),
  };
}

function parseResults(raw = "", totalMarks = 100, passingMarks = 33) {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => normalizeResultRow(item, totalMarks, passingMarks))
      .filter((item) => item.studentName);
  }

  return clean(raw)
    .split("\n")
    .map((line) => clean(line))
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",").map((part) => clean(part));
      const [studentName, marks = "0", remarks = ""] = parts;
      return normalizeResultRow({ studentName, marksObtained: marks, remarks }, totalMarks, passingMarks);
    })
    .filter((item) => item.studentName);
}

function buildPayload(body, user) {
  const totalMarks = Math.max(numberValue(body.totalMarks, 100), 1);
  const passingMarks = Math.min(numberValue(body.passingMarks, 33), totalMarks);
  const examDate = body.examDate ? new Date(body.examDate) : null;

  return {
    testTitle: clean(body.testTitle),
    testType: enumValue(body.testType, ["mcq", "descriptive", "mixed", "practical", "oral"], "mixed"),
    subject: clean(body.subject),
    topic: clean(body.topic),
    batchName: clean(body.batchName),
    teacherName: clean(body.teacherName),
    examDate,
    durationMinutes: numberValue(body.durationMinutes, 60),
    totalMarks,
    passingMarks,
    mode: enumValue(body.mode, ["offline", "online", "hybrid"], "offline"),
    difficulty: enumValue(body.difficulty, ["easy", "medium", "hard"], "medium"),
    status: enumValue(body.status, ["draft", "scheduled", "completed", "published"], "scheduled"),
    instructions: clean(body.instructions),
    results: parseResults(body.resultsText || body.results || body.studentResults, totalMarks, passingMarks),
    instituteName: user.instituteName || "NAXORA Institute",
    createdBy: user._id,
  };
}

function validatePayload(payload) {
  if (!payload.testTitle) return "Test title required hai";
  if (!payload.subject) return "Subject required hai";
  if (!payload.batchName) return "Batch name required hai";
  if (!payload.examDate || Number.isNaN(payload.examDate.getTime())) return "Valid exam date required hai";
  if (payload.passingMarks > payload.totalMarks) return "Passing marks total marks se zyada nahi ho sakte";
  return "";
}

function calculateSummary(item) {
  const rows = item.results || [];
  const appearedRows = rows.filter((row) => row.resultStatus !== "absent");
  const passRows = rows.filter((row) => row.resultStatus === "pass");
  const failRows = rows.filter((row) => row.resultStatus === "fail");
  const absentRows = rows.filter((row) => row.resultStatus === "absent");
  const highestMarks = rows.length ? Math.max(...rows.map((row) => row.marksObtained || 0)) : 0;
  const averageMarks = appearedRows.length
    ? Math.round(appearedRows.reduce((sum, row) => sum + (row.marksObtained || 0), 0) / appearedRows.length)
    : 0;
  const passPercent = appearedRows.length ? Math.round((passRows.length / appearedRows.length) * 100) : 0;

  return {
    studentCount: rows.length,
    appearedCount: appearedRows.length,
    passCount: passRows.length,
    failCount: failRows.length,
    absentCount: absentRows.length,
    highestMarks,
    averageMarks,
    passPercent,
  };
}

function toTestResponse(item) {
  const summary = calculateSummary(item);
  return {
    id: item._id,
    testTitle: item.testTitle,
    testType: item.testType,
    subject: item.subject,
    topic: item.topic,
    batchName: item.batchName,
    teacherName: item.teacherName,
    examDate: item.examDate,
    durationMinutes: item.durationMinutes,
    totalMarks: item.totalMarks,
    passingMarks: item.passingMarks,
    mode: item.mode,
    difficulty: item.difficulty,
    status: item.status,
    instructions: item.instructions,
    results: item.results || [],
    instituteName: item.instituteName,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    ...summary,
  };
}

export async function createTest(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const validationError = validatePayload(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const test = await TestResult.create(payload);
    res.status(201).json({ success: true, message: "Test/Result record create ho gaya", test: toTestResponse(test) });
  } catch (error) {
    next(error);
  }
}

export async function getTests(req, res, next) {
  try {
    const { search = "", subject = "", status = "", difficulty = "", mode = "" } = req.query;
    const owner = { createdBy: req.user._id };
    const filter = { ...owner };

    if (subject.trim()) filter.subject = new RegExp(subject.trim(), "i");
    if (status.trim()) filter.status = status.trim();
    if (difficulty.trim()) filter.difficulty = difficulty.trim();
    if (mode.trim()) filter.mode = mode.trim();

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { testTitle: regex },
        { subject: regex },
        { topic: regex },
        { batchName: regex },
        { teacherName: regex },
        { instructions: regex },
      ];
    }

    const tests = await TestResult.find(filter).sort({ examDate: -1, createdAt: -1 }).limit(120);
    const all = await TestResult.find(owner).select("status subject results totalMarks passingMarks");

    const summary = all.reduce(
      (acc, item) => {
        const itemSummary = calculateSummary(item);
        acc.totalTests += 1;
        if (item.status === "scheduled") acc.scheduledTests += 1;
        if (item.status === "completed") acc.completedTests += 1;
        if (item.status === "published") acc.publishedTests += 1;
        if (item.status === "draft") acc.draftTests += 1;
        acc.subjects.add(item.subject);
        acc.totalResultRows += itemSummary.studentCount;
        acc.totalPassRows += itemSummary.passCount;
        acc.totalFailRows += itemSummary.failCount;
        acc.totalAbsentRows += itemSummary.absentCount;
        return acc;
      },
      {
        totalTests: 0,
        scheduledTests: 0,
        completedTests: 0,
        publishedTests: 0,
        draftTests: 0,
        subjects: new Set(),
        totalResultRows: 0,
        totalPassRows: 0,
        totalFailRows: 0,
        totalAbsentRows: 0,
      }
    );

    res.json({
      success: true,
      count: tests.length,
      totalTests: summary.totalTests,
      scheduledTests: summary.scheduledTests,
      completedTests: summary.completedTests,
      publishedTests: summary.publishedTests,
      draftTests: summary.draftTests,
      subjectCount: summary.subjects.size,
      totalResultRows: summary.totalResultRows,
      totalPassRows: summary.totalPassRows,
      totalFailRows: summary.totalFailRows,
      totalAbsentRows: summary.totalAbsentRows,
      tests: tests.map(toTestResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function getTestById(req, res, next) {
  try {
    const test = await TestResult.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!test) return res.status(404).json({ success: false, message: "Test record nahi mila" });
    res.json({ success: true, test: toTestResponse(test) });
  } catch (error) {
    next(error);
  }
}

export async function updateTest(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    delete payload.createdBy;
    const validationError = validatePayload(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const test = await TestResult.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );

    if (!test) return res.status(404).json({ success: false, message: "Test record nahi mila" });
    res.json({ success: true, message: "Test/Result update ho gaya", test: toTestResponse(test) });
  } catch (error) {
    next(error);
  }
}

export async function updateTestStatus(req, res, next) {
  try {
    const update = {
      status: enumValue(req.body.status, ["draft", "scheduled", "completed", "published"], "scheduled"),
    };

    const test = await TestResult.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      update,
      { new: true, runValidators: true }
    );

    if (!test) return res.status(404).json({ success: false, message: "Test record nahi mila" });
    res.json({ success: true, message: "Test status update ho gaya", test: toTestResponse(test) });
  } catch (error) {
    next(error);
  }
}

export async function deleteTest(req, res, next) {
  try {
    const test = await TestResult.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!test) return res.status(404).json({ success: false, message: "Test record nahi mila" });
    res.json({ success: true, message: "Test/Result delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
