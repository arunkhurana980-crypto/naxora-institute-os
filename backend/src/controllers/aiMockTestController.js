import AiMockTest from "../models/AiMockTest.js";

function clean(value = "") {
  return String(value || "").trim();
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function parseList(value, max = 20) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).slice(0, max);
  return String(value || "")
    .split(/[\n|,]/)
    .map(clean)
    .filter(Boolean)
    .slice(0, max);
}

function titleCase(value = "") {
  return clean(value).replace(/\b\w/g, (char) => char.toUpperCase());
}

function languageText(language) {
  if (language === "hindi") return "Simple Hindi me answer samjhao.";
  if (language === "english") return "Use simple English explanations.";
  return "Hinglish me student-friendly explanation do.";
}

function buildInstructions(payload) {
  const modeLine = payload.testMode === "exam"
    ? "Ye exam-style timed test hai. Har question carefully solve karo."
    : payload.testMode === "quick_revision"
      ? "Ye quick revision test hai. Speed + concept clarity dono check honge."
      : payload.testMode === "homework"
        ? "Ye homework practice test hai. Answers copy nahi, samajhkar likho."
        : "Ye practice test hai. Galtiyon se learning improve karo.";

  return `${modeLine}\nDuration: ${payload.durationMinutes} minutes.\n${languageText(payload.language)}\nTopic focus: ${payload.topic}.\nDifficulty: ${payload.difficulty}.\nTotal marks: auto calculated from questions.`;
}

function questionTemplates(payload) {
  const topic = payload.topic;
  const hard = payload.difficulty === "advanced";
  const easy = payload.difficulty === "easy";
  const mark = easy ? 1 : hard ? 3 : 2;
  const exam = payload.examFocus.toUpperCase();
  const sourceHint = payload.sourceInput ? ` Source hint: ${payload.sourceInput.slice(0, 160)}` : "";

  const questions = [
    {
      questionType: "mcq",
      question: `${topic} ka basic meaning kya hai?`,
      options: [
        `${topic} ka core concept`,
        "Sirf random definition",
        "Koi unrelated formula",
        "None of these",
      ],
      correctAnswer: `${topic} ka core concept`,
      explanation: `${topic} ko pehle basic meaning se samjho, phir example se apply karo.${sourceHint}`,
      marks: mark,
    },
    {
      questionType: "mcq",
      question: `${topic} seekhne ka best order kya hoga?`,
      options: ["Meaning → Example → Practice", "Practice → Guess → Skip", "Only definition", "Only theory"],
      correctAnswer: "Meaning → Example → Practice",
      explanation: "Strong learning ke liye concept, example aur practice ka sequence best hota hai.",
      marks: mark,
    },
    {
      questionType: "true_false",
      question: `${topic} ko bina practice ke master karna easy hota hai. True ya False?`,
      options: ["True", "False"],
      correctAnswer: "False",
      explanation: "Practice ke bina topic ka real understanding weak reh jaati hai.",
      marks: 1,
    },
    {
      questionType: "short_answer",
      question: `${topic} ka ek real-life example likho.`,
      options: [],
      correctAnswer: "Student apne words me correct relevant example likhe.",
      explanation: "Example se teacher ko pata chalta hai ki concept actually samajh aaya ya nahi.",
      marks: hard ? 5 : 3,
    },
    {
      questionType: "descriptive",
      question: `${topic} ko step-by-step explain karo aur common mistakes bhi likho.`,
      options: [],
      correctAnswer: "Definition, use-case, steps, example aur mistakes cover honi chahiye.",
      explanation: `Ye ${exam} / classroom perspective se full understanding check karta hai.` ,
      marks: hard ? 8 : 5,
    },
  ];

  const extra = [
    {
      questionType: "mcq",
      question: `${topic} me sabse important cheez kya hoti hai?`,
      options: ["Concept clarity", "Ratta", "Guessing", "Skipping"],
      correctAnswer: "Concept clarity",
      explanation: "Concept clarity se questions solve karna easy hota hai.",
      marks: mark,
    },
    {
      questionType: "short_answer",
      question: `${topic} par 3 key points likho.`,
      options: [],
      correctAnswer: "Topic ke 3 relevant key points.",
      explanation: "Key points quick revision ke liye useful hote hain.",
      marks: 3,
    },
    {
      questionType: "mcq",
      question: `${topic} ke revision ke liye best method kya hai?`,
      options: ["Mind-map + questions", "Only scrolling", "Skip notes", "Random videos"],
      correctAnswer: "Mind-map + questions",
      explanation: "Mind-map aur questions se active recall hota hai.",
      marks: mark,
    },
    {
      questionType: "true_false",
      question: `${topic} me examples learning ko strong banate hain.`,
      options: ["True", "False"],
      correctAnswer: "True",
      explanation: "Examples abstract ideas ko practical banate hain.",
      marks: 1,
    },
    {
      questionType: "descriptive",
      question: `${topic} par teacher-style 5 minute explanation likho.`,
      options: [],
      correctAnswer: "Intro, concept, example, mistake, recap included honi chahiye.",
      explanation: "Teaching answer se depth clear hoti hai.",
      marks: hard ? 10 : 6,
    },
  ];

  return [...questions, ...extra];
}

function normalizeQuestions(value, payload) {
  if (Array.isArray(value) && value.length) {
    return value.slice(0, 100).map((item) => ({
      question: clean(item.question),
      questionType: enumValue(item.questionType, ["mcq", "true_false", "short_answer", "descriptive"], "mcq"),
      options: parseList(item.options, 6),
      correctAnswer: clean(item.correctAnswer),
      explanation: clean(item.explanation),
      marks: Math.max(1, Math.min(100, Number(item.marks || 1))),
    })).filter((item) => item.question);
  }

  const count = Math.max(3, Math.min(50, Number(payload.questionCount || 10)));
  const base = questionTemplates(payload);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const template = base[i % base.length];
    out.push({ ...template, question: i < base.length ? template.question : `${template.question} (${i + 1})` });
  }
  return out;
}

function buildPayload(body, user) {
  const language = enumValue(body.language, ["hinglish", "hindi", "english"], "hinglish");
  const difficulty = enumValue(body.difficulty, ["easy", "medium", "advanced"], "medium");
  const examFocus = enumValue(body.examFocus, ["boards", "jee", "neet", "nda", "upsc", "coding", "school", "general"], "coding");
  const testMode = enumValue(body.testMode, ["practice", "exam", "quick_revision", "homework"], "practice");
  const topic = clean(body.topic);

  const payload = {
    title: clean(body.title) || `${titleCase(topic)} AI Mock Test`,
    subject: clean(body.subject),
    topic,
    classLevel: clean(body.classLevel),
    courseName: clean(body.courseName),
    batchName: clean(body.batchName),
    language,
    difficulty,
    examFocus,
    testMode,
    durationMinutes: Math.max(5, Math.min(300, Number(body.durationMinutes || 30))),
    questionCount: Math.max(3, Math.min(50, Number(body.questionCount || 10))),
    instructions: clean(body.instructions),
    sourceInput: clean(body.sourceInput),
    questions: [],
    status: enumValue(body.status, ["draft", "published", "archived"], "draft"),
    isPinned: Boolean(body.isPinned),
    attempts: Number(body.attempts || 0),
    tags: parseList(body.tags, 12),
    instituteName: user.instituteName || "NAXORA Institute",
    createdBy: user._id,
  };

  payload.questions = normalizeQuestions(body.questions, payload);
  if (!payload.instructions) payload.instructions = buildInstructions(payload);
  return payload;
}

function validatePayload(payload) {
  if (!payload.subject) return "Subject required hai";
  if (!payload.topic) return "Topic required hai";
  if (!payload.title) return "Title required hai";
  if (!payload.questions.length) return "Questions generate nahi hue";
  return "";
}

function toResponse(test) {
  return {
    id: test._id,
    title: test.title,
    subject: test.subject,
    topic: test.topic,
    classLevel: test.classLevel,
    courseName: test.courseName,
    batchName: test.batchName,
    language: test.language,
    difficulty: test.difficulty,
    examFocus: test.examFocus,
    testMode: test.testMode,
    durationMinutes: test.durationMinutes,
    totalMarks: test.totalMarks,
    questionCount: test.questionCount,
    instructions: test.instructions,
    sourceInput: test.sourceInput,
    questions: test.questions || [],
    answerKey: test.answerKey || [],
    status: test.status,
    isPinned: test.isPinned,
    attempts: test.attempts || 0,
    tags: test.tags || [],
    instituteName: test.instituteName,
    createdAt: test.createdAt,
    updatedAt: test.updatedAt,
  };
}

async function buildSummary(ownerFilter) {
  const [total, drafts, published, archived, pinned, subjectAgg, modeAgg] = await Promise.all([
    AiMockTest.countDocuments(ownerFilter),
    AiMockTest.countDocuments({ ...ownerFilter, status: "draft" }),
    AiMockTest.countDocuments({ ...ownerFilter, status: "published" }),
    AiMockTest.countDocuments({ ...ownerFilter, status: "archived" }),
    AiMockTest.countDocuments({ ...ownerFilter, isPinned: true }),
    AiMockTest.aggregate([
      { $match: ownerFilter },
      { $group: { _id: "$subject", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 6 },
    ]),
    AiMockTest.aggregate([
      { $match: ownerFilter },
      { $group: { _id: "$testMode", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 6 },
    ]),
  ]);

  return {
    totalMockTests: total,
    draftTests: drafts,
    publishedTests: published,
    archivedTests: archived,
    pinnedTests: pinned,
    topSubjects: subjectAgg.map((item) => ({ subject: item._id || "Unknown", total: item.total })),
    modes: modeAgg.map((item) => ({ mode: item._id || "Unknown", total: item.total })),
  };
}

export async function generateAiMockTest(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });
    const test = await AiMockTest.create(payload);
    res.status(201).json({ success: true, message: "AI mock test generate aur save ho gaya", test: toResponse(test) });
  } catch (error) { next(error); }
}

export async function createAiMockTest(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });
    const test = await AiMockTest.create(payload);
    res.status(201).json({ success: true, message: "Mock test save ho gaya", test: toResponse(test) });
  } catch (error) { next(error); }
}

export async function getAiMockTests(req, res, next) {
  try {
    const { search = "", status = "", subject = "", difficulty = "", examFocus = "", testMode = "", pinned = "" } = req.query;
    const ownerFilter = { createdBy: req.user._id };
    const filter = { ...ownerFilter };
    if (status.trim()) filter.status = status.trim();
    if (subject.trim()) filter.subject = new RegExp(subject.trim(), "i");
    if (difficulty.trim()) filter.difficulty = difficulty.trim();
    if (examFocus.trim()) filter.examFocus = examFocus.trim();
    if (testMode.trim()) filter.testMode = testMode.trim();
    if (pinned === "true") filter.isPinned = true;
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ title: regex }, { subject: regex }, { topic: regex }, { tags: regex }];
    }
    const [tests, summary] = await Promise.all([
      AiMockTest.find(filter).sort({ isPinned: -1, updatedAt: -1 }).limit(80),
      buildSummary(ownerFilter),
    ]);
    res.json({ success: true, tests: tests.map(toResponse), ...summary });
  } catch (error) { next(error); }
}

export async function getAiMockTestById(req, res, next) {
  try {
    const test = await AiMockTest.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!test) return res.status(404).json({ success: false, message: "Mock test nahi mila" });
    res.json({ success: true, test: toResponse(test) });
  } catch (error) { next(error); }
}

export async function updateAiMockTest(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });
    const test = await AiMockTest.findOneAndUpdate({ _id: req.params.id, createdBy: req.user._id }, payload, { new: true, runValidators: true });
    if (!test) return res.status(404).json({ success: false, message: "Mock test nahi mila" });
    res.json({ success: true, message: "Mock test update ho gaya", test: toResponse(test) });
  } catch (error) { next(error); }
}

export async function updateAiMockTestStatus(req, res, next) {
  try {
    const status = enumValue(req.body.status, ["draft", "published", "archived"], "draft");
    const test = await AiMockTest.findOneAndUpdate({ _id: req.params.id, createdBy: req.user._id }, { status }, { new: true, runValidators: true });
    if (!test) return res.status(404).json({ success: false, message: "Mock test nahi mila" });
    res.json({ success: true, message: "Mock test status update ho gaya", test: toResponse(test) });
  } catch (error) { next(error); }
}

export async function toggleAiMockTestPin(req, res, next) {
  try {
    const test = await AiMockTest.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!test) return res.status(404).json({ success: false, message: "Mock test nahi mila" });
    test.isPinned = !test.isPinned;
    await test.save();
    res.json({ success: true, message: test.isPinned ? "Mock test pin ho gaya" : "Mock test unpin ho gaya", test: toResponse(test) });
  } catch (error) { next(error); }
}

export async function registerAiMockAttempt(req, res, next) {
  try {
    const test = await AiMockTest.findOneAndUpdate({ _id: req.params.id, createdBy: req.user._id }, { $inc: { attempts: 1 } }, { new: true });
    if (!test) return res.status(404).json({ success: false, message: "Mock test nahi mila" });
    res.json({ success: true, message: "Attempt count update ho gaya", test: toResponse(test) });
  } catch (error) { next(error); }
}

export async function deleteAiMockTest(req, res, next) {
  try {
    const test = await AiMockTest.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!test) return res.status(404).json({ success: false, message: "Mock test nahi mila" });
    res.json({ success: true, message: "Mock test delete ho gaya" });
  } catch (error) { next(error); }
}
