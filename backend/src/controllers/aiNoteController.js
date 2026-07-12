import AiNote from "../models/AiNote.js";

function clean(value = "") {
  return String(value || "").trim();
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function parseList(value, max = 12) {
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

function languageLine(language) {
  if (language === "hindi") return "Language: Simple Hindi. Hard words ko easy examples se samjhao.";
  if (language === "english") return "Language: Simple English with clear teaching flow.";
  return "Language: Hinglish, dosti wali classroom language, simple examples ke saath.";
}

function noteTypeLabel(type) {
  const labels = {
    class_notes: "Class Notes",
    revision: "Revision Notes",
    short_notes: "Short Notes",
    deep_notes: "Deep Explanation Notes",
    cheat_sheet: "Cheat Sheet",
    youtube_script_notes: "YouTube Teaching Notes",
  };
  return labels[type] || "Class Notes";
}

function buildKeyPoints({ topic, sourceInput, keyPoints }) {
  const manual = parseList(keyPoints, 10);
  if (manual.length) return manual;

  const words = clean(sourceInput)
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4)
    .slice(0, 8);

  const unique = [...new Set(words)].slice(0, 6);
  if (unique.length) return unique.map((word) => `${titleCase(word)} ka role ${topic} me samjho`);

  return [
    `${topic} ka basic meaning`,
    `${topic} ka real-life use`,
    `${topic} ke important steps`,
    `${topic} se related common mistake`,
    `${topic} ka exam/interview angle`,
  ];
}

function buildPractice(topic, difficulty) {
  const level = difficulty === "advanced" ? "advanced" : difficulty === "easy" ? "basic" : "medium";
  return [
    `${topic} ko apne words me explain karo.`,
    `${topic} ka ek real-life example likho.`,
    `${topic} me sabse important 5 points list karo.`,
    `${topic} par 3 ${level} level questions solve karo.`,
  ];
}

function buildHomework(topic, noteType) {
  if (noteType === "youtube_script_notes") {
    return [
      `${topic} par 60-second short script banao.`,
      `${topic} ke liye thumbnail text ke 5 ideas likho.`,
      `${topic} par ek beginner-friendly example record karo.`,
    ];
  }
  return [
    `${topic} ke notes ko 2 baar revise karo.`,
    `${topic} ka ek flowchart ya mind-map banao.`,
    `${topic} par 5 self-test questions banao.`,
  ];
}

function generateNotesContent(payload) {
  const keyPoints = buildKeyPoints(payload);
  const practice = buildPractice(payload.topic, payload.difficulty);
  const homework = buildHomework(payload.topic, payload.noteType);
  const typeLabel = noteTypeLabel(payload.noteType);
  const sourceBlock = payload.sourceInput
    ? `\n\nTeacher Input / Source Material:\n${payload.sourceInput}`
    : "";

  const depth = payload.difficulty === "advanced"
    ? "deep explanation, edge cases aur practical warnings"
    : payload.difficulty === "easy"
      ? "beginner-friendly short explanation"
      : "balanced explanation with examples";

  const examLine = payload.examFocus === "general"
    ? "Focus: Concept clarity + practical understanding."
    : `Focus: ${payload.examFocus.toUpperCase()} perspective ke important points.`;

  return `# ${payload.title}\n\nSubject: ${payload.subject}\nTopic: ${payload.topic}\nClass/Batch: ${payload.classLevel || payload.batchName || "General"}\nNote Type: ${typeLabel}\n${languageLine(payload.language)}\n${examLine}\nDepth: ${depth}.${sourceBlock}\n\n---\n\n## 1. Quick Concept\n${payload.topic} ko simple language me samjho: ye topic kisi bhi student ko base se clarity dene ke liye important hai. Pehle meaning samjho, phir use-case, phir steps, phir practice.\n\n## 2. Why This Topic Matters\n- Ye topic foundation strong karta hai.\n- Isse related questions exams, projects, interviews ya real work me baar-baar aate hain.\n- Agar student is topic ko examples ke saath samajh le, to advanced concepts easy ho jaate hain.\n\n## 3. Key Points\n${keyPoints.map((point, index) => `${index + 1}. ${point}`).join("\n")}\n\n## 4. Step-by-Step Explanation\n1. Pehle ${payload.topic} ka basic definition clear karo.\n2. Phir ek simple example lo aur usme concept apply karo.\n3. Important terms ko alag-alag breakdown karo.\n4. Common mistakes note karo.\n5. End me practice questions se check karo ki student ko topic samajh aaya ya nahi.\n\n## 5. Example\nExample socho: agar ${payload.topic} ko real classroom me padhana ho, to pehle ek daily-life situation se start karo. Fir bolo: “Ab isi idea ko technical language me samjhte hain.” Isse student ka fear kam hota hai.\n\n## 6. Common Mistakes\n- Sirf definition yaad karna, concept samajhna nahi.\n- Example ke bina topic padhna.\n- Previous topic ka revision skip karna.\n- Practice ke bina topic complete maan lena.\n\n## 7. Practice Questions\n${practice.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n## 8. Homework\n${homework.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n## 9. Final Revision Line\n${payload.topic} ko master karne ka best formula hai: meaning → example → steps → mistakes → practice.\n`;
}

function buildPayload(body, user, existingNotes = "") {
  const noteType = enumValue(
    body.noteType,
    ["class_notes", "revision", "short_notes", "deep_notes", "cheat_sheet", "youtube_script_notes"],
    "class_notes"
  );
  const language = enumValue(body.language, ["hinglish", "hindi", "english"], "hinglish");
  const difficulty = enumValue(body.difficulty, ["easy", "medium", "advanced"], "medium");
  const examFocus = enumValue(body.examFocus, ["boards", "jee", "neet", "nda", "upsc", "coding", "school", "general"], "coding");

  const base = {
    title: clean(body.title) || `${titleCase(body.topic)} ${noteTypeLabel(noteType)}`,
    subject: clean(body.subject),
    topic: clean(body.topic),
    classLevel: clean(body.classLevel),
    courseName: clean(body.courseName),
    batchName: clean(body.batchName),
    noteType,
    language,
    difficulty,
    examFocus,
    sourceInput: clean(body.sourceInput),
    keyPoints: parseList(body.keyPoints, 12),
    generatedNotes: clean(body.generatedNotes) || existingNotes,
    summary: clean(body.summary),
    practiceQuestions: parseList(body.practiceQuestions, 10),
    homework: parseList(body.homework, 10),
    status: enumValue(body.status, ["draft", "published", "archived"], "draft"),
    isPinned: Boolean(body.isPinned),
    tags: parseList(body.tags, 12),
    instituteName: user.instituteName || "NAXORA Institute",
    createdBy: user._id,
  };

  if (!base.generatedNotes) base.generatedNotes = generateNotesContent(base);
  if (!base.summary) base.summary = `${base.topic} ke liye ${noteTypeLabel(base.noteType)} ready hain: concept, key points, examples, mistakes, practice aur homework included.`;
  if (!base.practiceQuestions.length) base.practiceQuestions = buildPractice(base.topic, base.difficulty);
  if (!base.homework.length) base.homework = buildHomework(base.topic, base.noteType);
  if (!base.keyPoints.length) base.keyPoints = buildKeyPoints(base);

  return base;
}

function validatePayload(payload) {
  if (!payload.subject) return "Subject required hai";
  if (!payload.topic) return "Topic required hai";
  if (!payload.title) return "Title required hai";
  if (!payload.generatedNotes) return "Notes generate nahi hue";
  return "";
}

function toResponse(note) {
  return {
    id: note._id,
    title: note.title,
    subject: note.subject,
    topic: note.topic,
    classLevel: note.classLevel,
    courseName: note.courseName,
    batchName: note.batchName,
    noteType: note.noteType,
    language: note.language,
    difficulty: note.difficulty,
    examFocus: note.examFocus,
    sourceInput: note.sourceInput,
    keyPoints: note.keyPoints || [],
    generatedNotes: note.generatedNotes,
    summary: note.summary,
    practiceQuestions: note.practiceQuestions || [],
    homework: note.homework || [],
    status: note.status,
    isPinned: note.isPinned,
    tags: note.tags || [],
    instituteName: note.instituteName,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

async function buildSummary(ownerFilter) {
  const [total, drafts, published, archived, pinned, subjectsAgg, typeAgg] = await Promise.all([
    AiNote.countDocuments(ownerFilter),
    AiNote.countDocuments({ ...ownerFilter, status: "draft" }),
    AiNote.countDocuments({ ...ownerFilter, status: "published" }),
    AiNote.countDocuments({ ...ownerFilter, status: "archived" }),
    AiNote.countDocuments({ ...ownerFilter, isPinned: true }),
    AiNote.aggregate([
      { $match: ownerFilter },
      { $group: { _id: "$subject", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 6 },
    ]),
    AiNote.aggregate([
      { $match: ownerFilter },
      { $group: { _id: "$noteType", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 6 },
    ]),
  ]);

  return {
    totalNotes: total,
    draftNotes: drafts,
    publishedNotes: published,
    archivedNotes: archived,
    pinnedNotes: pinned,
    topSubjects: subjectsAgg.map((item) => ({ subject: item._id || "Unknown", total: item.total })),
    noteTypes: typeAgg.map((item) => ({ type: item._id || "Unknown", total: item.total })),
  };
}

export async function generateAiNote(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const note = await AiNote.create(payload);
    res.status(201).json({ success: true, message: "AI notes generate aur save ho gaye", note: toResponse(note) });
  } catch (error) {
    next(error);
  }
}

export async function createAiNote(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user, clean(req.body.generatedNotes));
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const note = await AiNote.create(payload);
    res.status(201).json({ success: true, message: "Notes save ho gaye", note: toResponse(note) });
  } catch (error) {
    next(error);
  }
}

export async function getAiNotes(req, res, next) {
  try {
    const { search = "", status = "", subject = "", noteType = "", difficulty = "", examFocus = "", pinned = "" } = req.query;
    const ownerFilter = { createdBy: req.user._id };
    const filter = { ...ownerFilter };

    if (status.trim()) filter.status = status.trim();
    if (subject.trim()) filter.subject = new RegExp(subject.trim(), "i");
    if (noteType.trim()) filter.noteType = noteType.trim();
    if (difficulty.trim()) filter.difficulty = difficulty.trim();
    if (examFocus.trim()) filter.examFocus = examFocus.trim();
    if (pinned === "true") filter.isPinned = true;

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { title: regex },
        { subject: regex },
        { topic: regex },
        { sourceInput: regex },
        { generatedNotes: regex },
        { tags: regex },
      ];
    }

    const [notes, summary] = await Promise.all([
      AiNote.find(filter).sort({ isPinned: -1, updatedAt: -1 }).limit(80),
      buildSummary(ownerFilter),
    ]);

    res.json({ success: true, ...summary, notes: notes.map(toResponse) });
  } catch (error) {
    next(error);
  }
}

export async function getAiNoteById(req, res, next) {
  try {
    const note = await AiNote.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!note) return res.status(404).json({ success: false, message: "AI note nahi mila" });
    res.json({ success: true, note: toResponse(note) });
  } catch (error) {
    next(error);
  }
}

export async function updateAiNote(req, res, next) {
  try {
    const oldNote = await AiNote.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!oldNote) return res.status(404).json({ success: false, message: "AI note nahi mila" });

    const payload = buildPayload(req.body, req.user, clean(req.body.generatedNotes) || oldNote.generatedNotes);
    delete payload.createdBy;

    const error = validatePayload({ ...oldNote.toObject(), ...payload });
    if (error) return res.status(400).json({ success: false, message: error });

    const note = await AiNote.findOneAndUpdate({ _id: req.params.id, createdBy: req.user._id }, payload, { new: true, runValidators: true });
    res.json({ success: true, message: "AI notes update ho gaye", note: toResponse(note) });
  } catch (error) {
    next(error);
  }
}

export async function updateAiNoteStatus(req, res, next) {
  try {
    const status = enumValue(req.body.status, ["draft", "published", "archived"], "draft");
    const note = await AiNote.findOneAndUpdate({ _id: req.params.id, createdBy: req.user._id }, { status }, { new: true, runValidators: true });
    if (!note) return res.status(404).json({ success: false, message: "AI note nahi mila" });
    res.json({ success: true, message: "Notes status update ho gaya", note: toResponse(note) });
  } catch (error) {
    next(error);
  }
}

export async function toggleAiNotePin(req, res, next) {
  try {
    const note = await AiNote.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!note) return res.status(404).json({ success: false, message: "AI note nahi mila" });
    note.isPinned = !note.isPinned;
    await note.save();
    res.json({ success: true, message: note.isPinned ? "Note pinned ho gaya" : "Note unpinned ho gaya", note: toResponse(note) });
  } catch (error) {
    next(error);
  }
}

export async function deleteAiNote(req, res, next) {
  try {
    const note = await AiNote.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!note) return res.status(404).json({ success: false, message: "AI note nahi mila" });
    res.json({ success: true, message: "AI note delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
