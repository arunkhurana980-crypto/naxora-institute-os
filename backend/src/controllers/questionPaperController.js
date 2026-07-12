import QuestionPaper from "../models/QuestionPaper.js";

function clean(value = "") {
  return String(value || "").trim();
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function numberValue(value, fallback = 0, min = 0, max = 1000) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function boolValue(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseOptions(options) {
  if (Array.isArray(options)) return options.map(clean).filter(Boolean).slice(0, 6);
  return String(options || "")
    .split(/[\n|,]/)
    .map(clean)
    .filter(Boolean)
    .slice(0, 6);
}

function buildQuestions(rows = []) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return safeRows
    .map((row) => {
      const questionType = enumValue(row.questionType, ["mcq", "descriptive", "practical", "true_false", "short_answer"], "mcq");
      const options = questionType === "mcq" || questionType === "true_false" ? parseOptions(row.options) : [];
      return {
        questionType,
        questionText: clean(row.questionText),
        options,
        correctAnswer: clean(row.correctAnswer),
        marks: numberValue(row.marks, 1, 0, 100),
        negativeMarks: numberValue(row.negativeMarks, 0, 0, 20),
        explanation: clean(row.explanation),
        difficulty: enumValue(row.difficulty, ["easy", "medium", "hard"], "medium"),
        topic: clean(row.topic),
      };
    })
    .filter((question) => question.questionText);
}

function sumMarks(questions) {
  return questions.reduce((sum, question) => sum + Number(question.marks || 0), 0);
}

function buildPayload(body, user) {
  const questions = buildQuestions(body.questions);
  const autoTotal = Math.max(1, sumMarks(questions));
  const totalMarks = body.totalMarks === "" || body.totalMarks === undefined ? autoTotal : numberValue(body.totalMarks, autoTotal, 1, 1000);

  return {
    paperTitle: clean(body.paperTitle),
    courseName: clean(body.courseName),
    batchName: clean(body.batchName),
    subject: clean(body.subject),
    topic: clean(body.topic),
    teacherName: clean(body.teacherName),
    paperType: enumValue(body.paperType, ["mcq", "descriptive", "practical", "mixed"], "mixed"),
    testMode: enumValue(body.testMode, ["online", "offline", "hybrid"], "online"),
    durationMinutes: numberValue(body.durationMinutes, 60, 1, 600),
    totalMarks,
    passingMarks: numberValue(body.passingMarks, Math.ceil(totalMarks * 0.33), 0, totalMarks),
    scheduledDate: dateValue(body.scheduledDate),
    startTime: clean(body.startTime),
    endTime: clean(body.endTime),
    instructions: clean(body.instructions),
    questions,
    attemptsAllowed: numberValue(body.attemptsAllowed, 1, 1, 10),
    shuffleQuestions: boolValue(body.shuffleQuestions, true),
    showResultInstant: boolValue(body.showResultInstant, false),
    status: enumValue(body.status, ["draft", "published", "assigned", "live", "closed", "archived"], "draft"),
    instituteName: user.instituteName || "NAXORA Institute",
    createdBy: user._id,
  };
}

function validatePayload(payload) {
  if (!payload.paperTitle) return "Paper title required hai";
  if (!payload.subject) return "Subject required hai";
  if (!payload.courseName && !payload.batchName) return "Course ya batch me se ek required hai";
  if (!payload.questions.length) return "Kam se kam ek question add karo";
  if (payload.questions.some((question) => question.questionType === "mcq" && question.options.length < 2)) {
    return "MCQ question me minimum 2 options required hain";
  }
  return "";
}

function questionStats(questions = []) {
  const stats = { mcq: 0, descriptive: 0, practical: 0, true_false: 0, short_answer: 0, easy: 0, medium: 0, hard: 0 };
  questions.forEach((question) => {
    stats[question.questionType] = (stats[question.questionType] || 0) + 1;
    stats[question.difficulty] = (stats[question.difficulty] || 0) + 1;
  });
  return stats;
}

function toResponse(paper) {
  const questions = paper.questions || [];
  const stats = questionStats(questions);
  return {
    id: paper._id,
    paperTitle: paper.paperTitle,
    courseName: paper.courseName,
    batchName: paper.batchName,
    subject: paper.subject,
    topic: paper.topic,
    teacherName: paper.teacherName,
    paperType: paper.paperType,
    testMode: paper.testMode,
    durationMinutes: paper.durationMinutes,
    totalMarks: paper.totalMarks,
    passingMarks: paper.passingMarks,
    scheduledDate: paper.scheduledDate,
    startTime: paper.startTime,
    endTime: paper.endTime,
    instructions: paper.instructions,
    questions,
    questionCount: questions.length,
    questionStats: stats,
    attemptsAllowed: paper.attemptsAllowed,
    shuffleQuestions: paper.shuffleQuestions,
    showResultInstant: paper.showResultInstant,
    status: paper.status,
    instituteName: paper.instituteName,
    createdAt: paper.createdAt,
    updatedAt: paper.updatedAt,
  };
}

async function buildSummary(ownerFilter) {
  const [total, draft, published, assigned, live, closed, questionAgg, marksAgg, avgDurationAgg, mcqAgg, descriptiveAgg] = await Promise.all([
    QuestionPaper.countDocuments(ownerFilter),
    QuestionPaper.countDocuments({ ...ownerFilter, status: "draft" }),
    QuestionPaper.countDocuments({ ...ownerFilter, status: "published" }),
    QuestionPaper.countDocuments({ ...ownerFilter, status: "assigned" }),
    QuestionPaper.countDocuments({ ...ownerFilter, status: "live" }),
    QuestionPaper.countDocuments({ ...ownerFilter, status: "closed" }),
    QuestionPaper.aggregate([
      { $match: ownerFilter },
      { $project: { count: { $size: { $ifNull: ["$questions", []] } } } },
      { $group: { _id: null, total: { $sum: "$count" } } },
    ]),
    QuestionPaper.aggregate([{ $match: ownerFilter }, { $group: { _id: null, total: { $sum: "$totalMarks" } } }]),
    QuestionPaper.aggregate([{ $match: ownerFilter }, { $group: { _id: null, avg: { $avg: "$durationMinutes" } } }]),
    QuestionPaper.aggregate([
      { $match: ownerFilter },
      { $unwind: { path: "$questions", preserveNullAndEmptyArrays: false } },
      { $match: { "questions.questionType": "mcq" } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]),
    QuestionPaper.aggregate([
      { $match: ownerFilter },
      { $unwind: { path: "$questions", preserveNullAndEmptyArrays: false } },
      { $match: { "questions.questionType": { $in: ["descriptive", "short_answer", "practical"] } } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]),
  ]);

  return {
    totalPapers: total,
    draftPapers: draft,
    publishedPapers: published,
    assignedPapers: assigned,
    livePapers: live,
    closedPapers: closed,
    totalQuestions: questionAgg[0]?.total || 0,
    totalMarks: marksAgg[0]?.total || 0,
    avgDuration: Math.round(avgDurationAgg[0]?.avg || 0),
    mcqQuestions: mcqAgg[0]?.total || 0,
    descriptiveQuestions: descriptiveAgg[0]?.total || 0,
  };
}

export async function createQuestionPaper(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const paper = await QuestionPaper.create(payload);
    res.status(201).json({ success: true, message: "Question paper save ho gaya", paper: toResponse(paper) });
  } catch (error) {
    next(error);
  }
}

export async function getQuestionPapers(req, res, next) {
  try {
    const { search = "", status = "", subject = "", paperType = "", testMode = "", batchName = "" } = req.query;
    const ownerFilter = { createdBy: req.user._id };
    const filter = { ...ownerFilter };

    if (status.trim()) filter.status = status.trim();
    if (subject.trim()) filter.subject = new RegExp(subject.trim(), "i");
    if (paperType.trim()) filter.paperType = paperType.trim();
    if (testMode.trim()) filter.testMode = testMode.trim();
    if (batchName.trim()) filter.batchName = new RegExp(batchName.trim(), "i");

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { paperTitle: regex },
        { subject: regex },
        { topic: regex },
        { courseName: regex },
        { batchName: regex },
        { teacherName: regex },
        { "questions.questionText": regex },
      ];
    }

    const [papers, summary] = await Promise.all([
      QuestionPaper.find(filter).sort({ createdAt: -1 }).limit(80),
      buildSummary(ownerFilter),
    ]);

    res.json({ success: true, ...summary, papers: papers.map(toResponse) });
  } catch (error) {
    next(error);
  }
}

export async function getQuestionPaperById(req, res, next) {
  try {
    const paper = await QuestionPaper.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!paper) return res.status(404).json({ success: false, message: "Question paper nahi mila" });
    res.json({ success: true, paper: toResponse(paper) });
  } catch (error) {
    next(error);
  }
}

export async function updateQuestionPaper(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const paper = await QuestionPaper.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );
    if (!paper) return res.status(404).json({ success: false, message: "Question paper nahi mila" });
    res.json({ success: true, message: "Question paper update ho gaya", paper: toResponse(paper) });
  } catch (error) {
    next(error);
  }
}

export async function updateQuestionPaperStatus(req, res, next) {
  try {
    const payload = {};
    if (req.body.status) payload.status = enumValue(req.body.status, ["draft", "published", "assigned", "live", "closed", "archived"], "draft");
    if (req.body.scheduledDate !== undefined) payload.scheduledDate = dateValue(req.body.scheduledDate);
    if (req.body.startTime !== undefined) payload.startTime = clean(req.body.startTime);
    if (req.body.endTime !== undefined) payload.endTime = clean(req.body.endTime);

    const paper = await QuestionPaper.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );
    if (!paper) return res.status(404).json({ success: false, message: "Question paper nahi mila" });
    res.json({ success: true, message: "Question paper status update ho gaya", paper: toResponse(paper) });
  } catch (error) {
    next(error);
  }
}

export async function duplicateQuestionPaper(req, res, next) {
  try {
    const paper = await QuestionPaper.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!paper) return res.status(404).json({ success: false, message: "Question paper nahi mila" });

    const clone = paper.toObject();
    delete clone._id;
    delete clone.createdAt;
    delete clone.updatedAt;
    clone.paperTitle = `${paper.paperTitle} - Copy`;
    clone.status = "draft";
    clone.createdBy = req.user._id;

    const created = await QuestionPaper.create(clone);
    res.status(201).json({ success: true, message: "Question paper duplicate ho gaya", paper: toResponse(created) });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuestionPaper(req, res, next) {
  try {
    const paper = await QuestionPaper.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!paper) return res.status(404).json({ success: false, message: "Question paper nahi mila" });
    res.json({ success: true, message: "Question paper delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
