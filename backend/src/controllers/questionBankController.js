import QuestionBankItem from "../models/QuestionBankItem.js";

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

function parseOptions(options) {
  if (Array.isArray(options)) return options.map(clean).filter(Boolean).slice(0, 8);
  return String(options || "")
    .split(/[\n|,]/)
    .map(clean)
    .filter(Boolean)
    .slice(0, 8);
}

function parseTags(tags) {
  if (Array.isArray(tags)) return tags.map(clean).filter(Boolean).slice(0, 12);
  return String(tags || "")
    .split(/[\n|,]/)
    .map(clean)
    .filter(Boolean)
    .slice(0, 12);
}

function buildPayload(body, user) {
  const questionType = enumValue(
    body.questionType,
    ["mcq", "true_false", "short_answer", "descriptive", "practical", "case_study"],
    "mcq"
  );

  let options = parseOptions(body.options);
  if (questionType === "true_false" && options.length < 2) options = ["True", "False"];
  if (!["mcq", "true_false"].includes(questionType)) options = [];

  return {
    questionText: clean(body.questionText),
    questionType,
    subject: clean(body.subject),
    chapter: clean(body.chapter),
    topic: clean(body.topic),
    courseName: clean(body.courseName),
    batchName: clean(body.batchName),
    classLevel: clean(body.classLevel),
    examTag: enumValue(body.examTag, ["boards", "jee", "neet", "nda", "upsc", "coding", "school", "other"], "coding"),
    difficulty: enumValue(body.difficulty, ["easy", "medium", "hard"], "medium"),
    language: enumValue(body.language, ["hinglish", "hindi", "english"], "hinglish"),
    options,
    correctAnswer: clean(body.correctAnswer),
    explanation: clean(body.explanation),
    marks: numberValue(body.marks, 1, 0, 100),
    negativeMarks: numberValue(body.negativeMarks, 0, 0, 20),
    sourceType: enumValue(body.sourceType, ["manual", "ai_generated", "previous_test", "book", "youtube_class", "imported"], "manual"),
    tags: parseTags(body.tags),
    status: enumValue(body.status, ["draft", "reviewed", "approved", "archived"], "draft"),
    instituteName: user.instituteName || "NAXORA Institute",
    createdBy: user._id,
  };
}

function validatePayload(payload) {
  if (!payload.questionText) return "Question text required hai";
  if (!payload.subject) return "Subject required hai";
  if (!payload.chapter) return "Chapter required hai";
  if (payload.questionType === "mcq" && payload.options.length < 2) return "MCQ me minimum 2 options required hain";
  if (["mcq", "true_false", "short_answer"].includes(payload.questionType) && !payload.correctAnswer) return "Correct answer required hai";
  return "";
}

function toResponse(item) {
  return {
    id: item._id,
    questionText: item.questionText,
    questionType: item.questionType,
    subject: item.subject,
    chapter: item.chapter,
    topic: item.topic,
    courseName: item.courseName,
    batchName: item.batchName,
    classLevel: item.classLevel,
    examTag: item.examTag,
    difficulty: item.difficulty,
    language: item.language,
    options: item.options || [],
    correctAnswer: item.correctAnswer,
    explanation: item.explanation,
    marks: item.marks,
    negativeMarks: item.negativeMarks,
    sourceType: item.sourceType,
    tags: item.tags || [],
    usageCount: item.usageCount || 0,
    lastUsedAt: item.lastUsedAt,
    status: item.status,
    instituteName: item.instituteName,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function buildSummary(ownerFilter) {
  const [
    total,
    draft,
    reviewed,
    approved,
    archived,
    mcq,
    subjective,
    hard,
    medium,
    easy,
    totalMarksAgg,
    usedAgg,
    subjectsAgg,
  ] = await Promise.all([
    QuestionBankItem.countDocuments(ownerFilter),
    QuestionBankItem.countDocuments({ ...ownerFilter, status: "draft" }),
    QuestionBankItem.countDocuments({ ...ownerFilter, status: "reviewed" }),
    QuestionBankItem.countDocuments({ ...ownerFilter, status: "approved" }),
    QuestionBankItem.countDocuments({ ...ownerFilter, status: "archived" }),
    QuestionBankItem.countDocuments({ ...ownerFilter, questionType: "mcq" }),
    QuestionBankItem.countDocuments({ ...ownerFilter, questionType: { $in: ["short_answer", "descriptive", "practical", "case_study"] } }),
    QuestionBankItem.countDocuments({ ...ownerFilter, difficulty: "hard" }),
    QuestionBankItem.countDocuments({ ...ownerFilter, difficulty: "medium" }),
    QuestionBankItem.countDocuments({ ...ownerFilter, difficulty: "easy" }),
    QuestionBankItem.aggregate([{ $match: ownerFilter }, { $group: { _id: null, total: { $sum: "$marks" } } }]),
    QuestionBankItem.aggregate([{ $match: ownerFilter }, { $group: { _id: null, total: { $sum: "$usageCount" } } }]),
    QuestionBankItem.aggregate([
      { $match: ownerFilter },
      { $group: { _id: "$subject", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 6 },
    ]),
  ]);

  return {
    totalQuestions: total,
    draftQuestions: draft,
    reviewedQuestions: reviewed,
    approvedQuestions: approved,
    archivedQuestions: archived,
    mcqQuestions: mcq,
    subjectiveQuestions: subjective,
    hardQuestions: hard,
    mediumQuestions: medium,
    easyQuestions: easy,
    totalMarks: totalMarksAgg[0]?.total || 0,
    totalUsage: usedAgg[0]?.total || 0,
    topSubjects: subjectsAgg.map((item) => ({ subject: item._id || "Unknown", total: item.total })),
  };
}

export async function createQuestionBankItem(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const question = await QuestionBankItem.create(payload);
    res.status(201).json({ success: true, message: "Question bank me question save ho gaya", question: toResponse(question) });
  } catch (error) {
    next(error);
  }
}

export async function getQuestionBankItems(req, res, next) {
  try {
    const { search = "", status = "", subject = "", chapter = "", questionType = "", difficulty = "", examTag = "" } = req.query;
    const ownerFilter = { createdBy: req.user._id };
    const filter = { ...ownerFilter };

    if (status.trim()) filter.status = status.trim();
    if (subject.trim()) filter.subject = new RegExp(subject.trim(), "i");
    if (chapter.trim()) filter.chapter = new RegExp(chapter.trim(), "i");
    if (questionType.trim()) filter.questionType = questionType.trim();
    if (difficulty.trim()) filter.difficulty = difficulty.trim();
    if (examTag.trim()) filter.examTag = examTag.trim();

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { questionText: regex },
        { subject: regex },
        { chapter: regex },
        { topic: regex },
        { courseName: regex },
        { classLevel: regex },
        { tags: regex },
      ];
    }

    const [questions, summary] = await Promise.all([
      QuestionBankItem.find(filter).sort({ createdAt: -1 }).limit(120),
      buildSummary(ownerFilter),
    ]);

    res.json({ success: true, ...summary, questions: questions.map(toResponse) });
  } catch (error) {
    next(error);
  }
}

export async function getQuestionBankItemById(req, res, next) {
  try {
    const question = await QuestionBankItem.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!question) return res.status(404).json({ success: false, message: "Question nahi mila" });
    res.json({ success: true, question: toResponse(question) });
  } catch (error) {
    next(error);
  }
}

export async function updateQuestionBankItem(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const question = await QuestionBankItem.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );
    if (!question) return res.status(404).json({ success: false, message: "Question nahi mila" });
    res.json({ success: true, message: "Question update ho gaya", question: toResponse(question) });
  } catch (error) {
    next(error);
  }
}

export async function updateQuestionBankItemStatus(req, res, next) {
  try {
    const status = enumValue(req.body.status, ["draft", "reviewed", "approved", "archived"], "draft");
    const question = await QuestionBankItem.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status },
      { new: true, runValidators: true }
    );
    if (!question) return res.status(404).json({ success: false, message: "Question nahi mila" });
    res.json({ success: true, message: "Question status update ho gaya", question: toResponse(question) });
  } catch (error) {
    next(error);
  }
}

export async function markQuestionUsed(req, res, next) {
  try {
    const question = await QuestionBankItem.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } },
      { new: true, runValidators: true }
    );
    if (!question) return res.status(404).json({ success: false, message: "Question nahi mila" });
    res.json({ success: true, message: "Question usage count update ho gaya", question: toResponse(question) });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuestionBankItem(req, res, next) {
  try {
    const question = await QuestionBankItem.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!question) return res.status(404).json({ success: false, message: "Question nahi mila" });
    res.json({ success: true, message: "Question delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
