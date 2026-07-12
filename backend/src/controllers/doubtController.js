import Doubt from "../models/Doubt.js";

function clean(value = "") {
  return String(value || "").trim();
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function extractTags(subject, topic, question) {
  const raw = `${subject} ${topic} ${question}`.toLowerCase();
  const possible = [
    "html", "css", "javascript", "react", "node", "mongodb", "jwt", "api", "python", "ai",
    "math", "physics", "chemistry", "biology", "english", "coding", "web", "frontend", "backend",
  ];
  const found = possible.filter((tag) => raw.includes(tag));
  return [...new Set([clean(subject).toLowerCase(), clean(topic).toLowerCase(), ...found])]
    .filter(Boolean)
    .slice(0, 8);
}

function subjectHint(subject = "") {
  const s = subject.toLowerCase();
  if (s.includes("code") || s.includes("web") || s.includes("javascript") || s.includes("react") || s.includes("node")) {
    return "Code wale doubt me pehle error message, file name aur expected output compare karo. Phir small test case se check karo.";
  }
  if (s.includes("math")) return "Math doubt me formula likho, given values अलग karo, phir step-by-step substitute karo.";
  if (s.includes("chem")) return "Chemistry me concept + reaction/condition + exception teen cheeze saath me yaad karo.";
  if (s.includes("physics")) return "Physics me diagram, given data, formula aur units ko alag-alag verify karo.";
  if (s.includes("english")) return "English doubt me meaning, grammar rule aur example sentence teen parts me practice karo.";
  return "Concept ko definition, example aur practice question ke format me todkar samjho.";
}

function buildLocalAIAnswer({ studentName, subject, topic, question, difficulty }) {
  const student = clean(studentName) || "Student";
  const subj = clean(subject) || "General";
  const top = clean(topic) || "Current Topic";
  const q = clean(question);
  const level = enumValue(difficulty, ["easy", "medium", "hard"], "medium");

  const depthLine = {
    easy: "Main isko bilkul basic level se explain kar raha hoon.",
    medium: "Main isko exam + practical dono angle se explain kar raha hoon.",
    hard: "Ye advanced doubt hai, isliye pehle foundation clear karke phir deeper logic dekho.",
  }[level];

  const shortAnswer = `${student}, ${subj} ke '${top}' doubt ka core idea ye hai: question ko chhote parts me todkar definition, reason, example aur practice ke saath solve karna hai.`;

  const aiAnswer = [
    `🤖 NAXORA AI Doubt Solver`,
    `Student: ${student}`,
    `Subject: ${subj}`,
    `Topic: ${top}`,
    `Level: ${level}`,
    "",
    `✅ Short Explanation`,
    `${shortAnswer} ${depthLine}`,
    "",
    `🧠 Doubt ko samajhne ka tareeqa`,
    `1. Question me main keyword identify karo: “${q.slice(0, 120)}${q.length > 120 ? "..." : ""}”`,
    `2. Topic ka basic rule ya definition likho.`,
    `3. Jo confusion hai usko ek small example se test karo.`,
    `4. Answer ko apne words me दो lines me repeat karo.`,
    "",
    `📌 Concept Formula`,
    `${subjectHint(subj)}`,
    "",
    `🔥 Example Style Answer`,
    `Maan lo student ko '${top}' samajhna hai. Pehle हम simple language me rule bolenge, phir ek छोटा example banayenge, phir same pattern ka ek practice question karenge. Isse brain ko pattern pakad aata hai aur doubt clear hota hai.`,
    "",
    `📝 Practice Task`,
    `Aaj isi topic par 3 questions solve karo: 1 easy, 1 medium, 1 thoda hard. Har question ke neeche “maine ye step kyu lagaya?” likho.`,
    "",
    `👨‍🏫 Teacher Follow-up`,
    `Agar student abhi bhi confuse ho, teacher ko exact step batana chahiye jahan student atak raha hai. Uske baad blackboard par same concept ka दूसरा example karwana best rahega.`,
  ].join("\n");

  return { shortAnswer, aiAnswer };
}

function toDoubtResponse(doubt) {
  return {
    id: doubt._id,
    studentName: doubt.studentName,
    studentClass: doubt.studentClass,
    subject: doubt.subject,
    topic: doubt.topic,
    question: doubt.question,
    difficulty: doubt.difficulty,
    priority: doubt.priority,
    status: doubt.status,
    aiAnswer: doubt.aiAnswer,
    shortAnswer: doubt.shortAnswer,
    teacherReply: doubt.teacherReply,
    tags: doubt.tags,
    source: doubt.source,
    instituteName: doubt.instituteName,
    createdAt: doubt.createdAt,
    updatedAt: doubt.updatedAt,
  };
}

export async function askDoubt(req, res, next) {
  try {
    const payload = {
      studentName: clean(req.body.studentName),
      studentClass: clean(req.body.studentClass),
      subject: clean(req.body.subject),
      topic: clean(req.body.topic),
      question: clean(req.body.question),
      difficulty: enumValue(req.body.difficulty, ["easy", "medium", "hard"], "medium"),
      priority: enumValue(req.body.priority, ["low", "normal", "high"], "normal"),
    };

    if (!payload.studentName) return res.status(400).json({ success: false, message: "Student name required hai" });
    if (!payload.subject) return res.status(400).json({ success: false, message: "Subject required hai" });
    if (!payload.question || payload.question.length < 8) {
      return res.status(400).json({ success: false, message: "Question kam se kam 8 characters ka hona chahiye" });
    }

    const { shortAnswer, aiAnswer } = buildLocalAIAnswer(payload);
    const tags = extractTags(payload.subject, payload.topic, payload.question);

    const doubt = await Doubt.create({
      ...payload,
      shortAnswer,
      aiAnswer,
      tags,
      status: "solved",
      source: "naxora-local-ai",
      instituteName: req.user.instituteName || "NAXORA Institute",
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "AI doubt answer generate ho gaya",
      doubt: toDoubtResponse(doubt),
    });
  } catch (error) {
    next(error);
  }
}

export async function getDoubts(req, res, next) {
  try {
    const { search = "", subject = "", status = "", difficulty = "" } = req.query;
    const owner = { createdBy: req.user._id };
    const filter = { ...owner };

    if (subject.trim()) filter.subject = new RegExp(subject.trim(), "i");
    if (status.trim()) filter.status = status.trim();
    if (difficulty.trim()) filter.difficulty = difficulty.trim();

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { studentName: regex },
        { studentClass: regex },
        { subject: regex },
        { topic: regex },
        { question: regex },
        { aiAnswer: regex },
        { teacherReply: regex },
      ];
    }

    const doubts = await Doubt.find(filter).sort({ createdAt: -1 }).limit(100);
    const all = await Doubt.find(owner).select("status difficulty subject");

    const summary = all.reduce(
      (acc, item) => {
        acc.totalDoubts += 1;
        if (item.status === "solved") acc.solvedDoubts += 1;
        if (item.status === "pending") acc.pendingDoubts += 1;
        if (item.status === "teacher-review") acc.reviewDoubts += 1;
        if (item.difficulty === "hard") acc.hardDoubts += 1;
        acc.subjects.add(item.subject);
        return acc;
      },
      { totalDoubts: 0, solvedDoubts: 0, pendingDoubts: 0, reviewDoubts: 0, hardDoubts: 0, subjects: new Set() }
    );

    res.json({
      success: true,
      count: doubts.length,
      totalDoubts: summary.totalDoubts,
      solvedDoubts: summary.solvedDoubts,
      pendingDoubts: summary.pendingDoubts,
      reviewDoubts: summary.reviewDoubts,
      hardDoubts: summary.hardDoubts,
      subjectCount: summary.subjects.size,
      doubts: doubts.map(toDoubtResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function getDoubtById(req, res, next) {
  try {
    const doubt = await Doubt.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!doubt) return res.status(404).json({ success: false, message: "Doubt nahi mila" });
    res.json({ success: true, doubt: toDoubtResponse(doubt) });
  } catch (error) {
    next(error);
  }
}

export async function updateDoubt(req, res, next) {
  try {
    const payload = {
      studentName: clean(req.body.studentName),
      studentClass: clean(req.body.studentClass),
      subject: clean(req.body.subject),
      topic: clean(req.body.topic),
      question: clean(req.body.question),
      difficulty: enumValue(req.body.difficulty, ["easy", "medium", "hard"], "medium"),
      priority: enumValue(req.body.priority, ["low", "normal", "high"], "normal"),
      status: enumValue(req.body.status, ["solved", "pending", "teacher-review"], "solved"),
      teacherReply: clean(req.body.teacherReply),
    };

    if (!payload.studentName) return res.status(400).json({ success: false, message: "Student name required hai" });
    if (!payload.subject) return res.status(400).json({ success: false, message: "Subject required hai" });
    if (!payload.question || payload.question.length < 8) {
      return res.status(400).json({ success: false, message: "Question kam se kam 8 characters ka hona chahiye" });
    }

    const generated = buildLocalAIAnswer(payload);
    payload.shortAnswer = generated.shortAnswer;
    payload.aiAnswer = generated.aiAnswer;
    payload.tags = extractTags(payload.subject, payload.topic, payload.question);

    const doubt = await Doubt.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );

    if (!doubt) return res.status(404).json({ success: false, message: "Doubt nahi mila" });
    res.json({ success: true, message: "Doubt update ho gaya", doubt: toDoubtResponse(doubt) });
  } catch (error) {
    next(error);
  }
}

export async function replyDoubt(req, res, next) {
  try {
    const teacherReply = clean(req.body.teacherReply);
    if (!teacherReply) return res.status(400).json({ success: false, message: "Teacher reply required hai" });

    const doubt = await Doubt.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { teacherReply, status: "solved", source: "teacher" },
      { new: true, runValidators: true }
    );

    if (!doubt) return res.status(404).json({ success: false, message: "Doubt nahi mila" });
    res.json({ success: true, message: "Teacher reply save ho gaya", doubt: toDoubtResponse(doubt) });
  } catch (error) {
    next(error);
  }
}

export async function deleteDoubt(req, res, next) {
  try {
    const doubt = await Doubt.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!doubt) return res.status(404).json({ success: false, message: "Doubt nahi mila" });
    res.json({ success: true, message: "Doubt delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
