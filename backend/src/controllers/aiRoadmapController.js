import AiRoadmap from "../models/AiRoadmap.js";

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

function languageLine(language) {
  if (language === "hindi") return "Hindi me simple explanation aur weekly tasks follow karo.";
  if (language === "english") return "Follow this roadmap in simple English with weekly practice.";
  return "Hinglish me simple weekly plan follow karo, theory + practice dono maintain karo.";
}

function defaultWeakAreas(goal) {
  const lower = goal.toLowerCase();
  if (lower.includes("coding") || lower.includes("web") || lower.includes("app")) {
    return ["Logic building", "Daily coding practice", "Project confidence", "Debugging habit"];
  }
  if (lower.includes("jee") || lower.includes("neet") || lower.includes("exam")) {
    return ["Concept clarity", "Formula recall", "PYQ practice", "Time management"];
  }
  return ["Consistency", "Revision system", "Practice routine", "Confidence building"];
}

function buildRecommendations(payload) {
  const base = [
    `Daily minimum ${Math.max(30, Math.round((payload.weeklyHours * 60) / 7))} minutes focused study karo.`,
    "Har week ek small output banao: notes, test, mini project ya solved sheet.",
    "Sunday ko revision + self test compulsory rakho.",
  ];

  if (payload.learningStyle === "visual") base.push("Diagrams, mind maps aur visual examples se topic revise karo.");
  if (payload.learningStyle === "practice") base.push("Theory ke turant baad 10-20 practice questions solve karo.");
  if (payload.learningStyle === "theory") base.push("Pehle concept notes banao, phir examples aur questions lagao.");
  if (payload.priority === "urgent") base.push("Urgent goal ke liye distraction block karo aur daily progress tracker maintain karo.");
  return base;
}

function makeWeeklyPlan(payload) {
  const weeks = Math.max(1, Math.min(52, Number(payload.durationWeeks || 12)));
  const goalTitle = titleCase(payload.goal);
  const weakAreas = payload.weakAreas.length ? payload.weakAreas : defaultWeakAreas(payload.goal);
  const plan = [];

  for (let i = 1; i <= weeks; i += 1) {
    const phase = i <= Math.ceil(weeks * 0.25)
      ? "Foundation"
      : i <= Math.ceil(weeks * 0.55)
        ? "Core Practice"
        : i <= Math.ceil(weeks * 0.8)
          ? "Project/Test Practice"
          : "Final Revision";
    const weakFocus = weakAreas[(i - 1) % weakAreas.length];
    const tasks = [
      `${goalTitle} ka ${phase.toLowerCase()} module complete karo`,
      `${weakFocus} par focused practice karo`,
      "Class notes/revision notes update karo",
      "Weekly self-test do aur mistakes list banao",
    ];

    if (i % 4 === 0) tasks.push("Mini milestone review: parent/teacher ko progress dikhao");
    if (payload.goal.toLowerCase().includes("coding") || payload.goal.toLowerCase().includes("web")) {
      tasks.push(i % 3 === 0 ? "Ek mini project ya UI component build karo" : "Daily 2 coding problems/debug tasks solve karo");
    }

    plan.push({
      weekNo: i,
      title: `Week ${i}: ${phase}`,
      focus: `${weakFocus} + ${payload.subject || payload.goal} improvement`,
      tasks,
      resources: [
        "NAXORA class notes",
        "Practice questions/mock test",
        "Teacher doubt session",
      ],
      milestone: i === weeks ? `${goalTitle} final review complete` : `${phase} week ${i} output ready`,
      expectedHours: payload.weeklyHours,
    });
  }

  return plan;
}

function normalizeWeeklyPlan(value, payload) {
  if (Array.isArray(value) && value.length) {
    return value.slice(0, 52).map((item, index) => ({
      weekNo: Number(item.weekNo || index + 1),
      title: clean(item.title) || `Week ${index + 1}`,
      focus: clean(item.focus),
      tasks: parseList(item.tasks, 12),
      resources: parseList(item.resources, 10),
      milestone: clean(item.milestone),
      expectedHours: Math.max(0, Math.min(80, Number(item.expectedHours || payload.weeklyHours || 5))),
    })).filter((item) => item.title);
  }
  return makeWeeklyPlan(payload);
}

function buildPayload(body, user) {
  const goal = clean(body.goal);
  const payload = {
    studentName: clean(body.studentName),
    goal,
    currentLevel: enumValue(body.currentLevel, ["beginner", "basic", "intermediate", "advanced"], "beginner"),
    targetLevel: enumValue(body.targetLevel, ["basic", "intermediate", "advanced", "job_ready", "exam_ready"], "job_ready"),
    subject: clean(body.subject),
    courseName: clean(body.courseName),
    batchName: clean(body.batchName),
    durationWeeks: Math.max(1, Math.min(52, Number(body.durationWeeks || 12))),
    weeklyHours: Math.max(1, Math.min(80, Number(body.weeklyHours || 8))),
    language: enumValue(body.language, ["hinglish", "hindi", "english"], "hinglish"),
    learningStyle: enumValue(body.learningStyle, ["visual", "practice", "theory", "mixed"], "mixed"),
    priority: enumValue(body.priority, ["normal", "high", "urgent"], "normal"),
    weakAreas: parseList(body.weakAreas, 12),
    strengths: parseList(body.strengths, 12),
    recommendations: parseList(body.recommendations, 20),
    weeklyPlan: [],
    milestones: parseList(body.milestones, 20),
    status: enumValue(body.status, ["draft", "active", "completed", "archived"], "draft"),
    isPinned: Boolean(body.isPinned),
    progressPercent: Math.max(0, Math.min(100, Number(body.progressPercent || 0))),
    notes: clean(body.notes),
    instituteName: user.instituteName || "NAXORA Institute",
    createdBy: user._id,
  };

  if (!payload.weakAreas.length) payload.weakAreas = defaultWeakAreas(goal);
  if (!payload.recommendations.length) payload.recommendations = buildRecommendations(payload);
  if (!payload.milestones.length) {
    payload.milestones = [
      "Foundation complete",
      "Practice routine stable",
      "Mini project/test performance improved",
      "Final review completed",
    ];
  }
  payload.weeklyPlan = normalizeWeeklyPlan(body.weeklyPlan, payload);
  if (!payload.notes) payload.notes = `${languageLine(payload.language)} Goal: ${payload.goal}.`;
  return payload;
}

function validatePayload(payload) {
  if (!payload.studentName) return "Student name required hai";
  if (!payload.goal) return "Student goal required hai";
  if (!payload.weeklyPlan.length) return "Weekly roadmap generate nahi hua";
  return "";
}

function toResponse(roadmap) {
  return {
    id: roadmap._id,
    studentName: roadmap.studentName,
    goal: roadmap.goal,
    currentLevel: roadmap.currentLevel,
    targetLevel: roadmap.targetLevel,
    subject: roadmap.subject,
    courseName: roadmap.courseName,
    batchName: roadmap.batchName,
    durationWeeks: roadmap.durationWeeks,
    weeklyHours: roadmap.weeklyHours,
    language: roadmap.language,
    learningStyle: roadmap.learningStyle,
    priority: roadmap.priority,
    weakAreas: roadmap.weakAreas || [],
    strengths: roadmap.strengths || [],
    recommendations: roadmap.recommendations || [],
    weeklyPlan: roadmap.weeklyPlan || [],
    milestones: roadmap.milestones || [],
    status: roadmap.status,
    isPinned: roadmap.isPinned,
    progressPercent: roadmap.progressPercent,
    notes: roadmap.notes,
    instituteName: roadmap.instituteName,
    createdAt: roadmap.createdAt,
    updatedAt: roadmap.updatedAt,
  };
}

async function listRoadmaps(req, res, next) {
  try {
    const { search = "", status = "", priority = "", subject = "" } = req.query;
    const filter = { createdBy: req.user._id };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (subject) filter.subject = new RegExp(clean(subject), "i");
    if (search) {
      filter.$or = [
        { studentName: new RegExp(clean(search), "i") },
        { goal: new RegExp(clean(search), "i") },
        { subject: new RegExp(clean(search), "i") },
        { courseName: new RegExp(clean(search), "i") },
      ];
    }

    const roadmaps = await AiRoadmap.find(filter).sort({ isPinned: -1, updatedAt: -1 }).limit(300);
    const all = await AiRoadmap.find({ createdBy: req.user._id }).select("status priority progressPercent isPinned");
    const averageProgress = all.length ? Math.round(all.reduce((sum, item) => sum + Number(item.progressPercent || 0), 0) / all.length) : 0;

    res.json({
      success: true,
      roadmaps: roadmaps.map(toResponse),
      totalRoadmaps: all.length,
      activeRoadmaps: all.filter((item) => item.status === "active").length,
      completedRoadmaps: all.filter((item) => item.status === "completed").length,
      pinnedRoadmaps: all.filter((item) => item.isPinned).length,
      averageProgress,
    });
  } catch (error) {
    next(error);
  }
}

async function createRoadmap(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const message = validatePayload(payload);
    if (message) return res.status(400).json({ success: false, message });
    const roadmap = await AiRoadmap.create(payload);
    res.status(201).json({ success: true, message: "AI roadmap save ho gaya", roadmap: toResponse(roadmap) });
  } catch (error) {
    next(error);
  }
}

async function generateRoadmap(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    payload.status = enumValue(req.body.status, ["draft", "active", "completed", "archived"], "active");
    const message = validatePayload(payload);
    if (message) return res.status(400).json({ success: false, message });
    const roadmap = await AiRoadmap.create(payload);
    res.status(201).json({ success: true, message: "AI student roadmap generate aur save ho gaya", roadmap: toResponse(roadmap) });
  } catch (error) {
    next(error);
  }
}

async function getRoadmapById(req, res, next) {
  try {
    const roadmap = await AiRoadmap.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!roadmap) return res.status(404).json({ success: false, message: "Roadmap not found" });
    res.json({ success: true, roadmap: toResponse(roadmap) });
  } catch (error) {
    next(error);
  }
}

async function updateRoadmap(req, res, next) {
  try {
    const existing = await AiRoadmap.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!existing) return res.status(404).json({ success: false, message: "Roadmap not found" });
    const payload = buildPayload(req.body, req.user);
    const message = validatePayload(payload);
    if (message) return res.status(400).json({ success: false, message });
    Object.assign(existing, payload);
    await existing.save();
    res.json({ success: true, message: "Roadmap update ho gaya", roadmap: toResponse(existing) });
  } catch (error) {
    next(error);
  }
}

async function updateRoadmapStatus(req, res, next) {
  try {
    const status = enumValue(req.body.status, ["draft", "active", "completed", "archived"], "active");
    const roadmap = await AiRoadmap.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status },
      { new: true, runValidators: true }
    );
    if (!roadmap) return res.status(404).json({ success: false, message: "Roadmap not found" });
    res.json({ success: true, message: `Roadmap ${status} ho gaya`, roadmap: toResponse(roadmap) });
  } catch (error) {
    next(error);
  }
}

async function toggleRoadmapPin(req, res, next) {
  try {
    const roadmap = await AiRoadmap.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!roadmap) return res.status(404).json({ success: false, message: "Roadmap not found" });
    roadmap.isPinned = !roadmap.isPinned;
    await roadmap.save();
    res.json({ success: true, message: roadmap.isPinned ? "Roadmap pinned" : "Roadmap unpinned", roadmap: toResponse(roadmap) });
  } catch (error) {
    next(error);
  }
}

async function updateRoadmapProgress(req, res, next) {
  try {
    const progressPercent = Math.max(0, Math.min(100, Number(req.body.progressPercent || 0)));
    const roadmap = await AiRoadmap.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { progressPercent, status: progressPercent >= 100 ? "completed" : req.body.status || undefined },
      { new: true, runValidators: true }
    );
    if (!roadmap) return res.status(404).json({ success: false, message: "Roadmap not found" });
    res.json({ success: true, message: "Roadmap progress update ho gaya", roadmap: toResponse(roadmap) });
  } catch (error) {
    next(error);
  }
}

async function deleteRoadmap(req, res, next) {
  try {
    const roadmap = await AiRoadmap.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!roadmap) return res.status(404).json({ success: false, message: "Roadmap not found" });
    res.json({ success: true, message: "Roadmap delete ho gaya" });
  } catch (error) {
    next(error);
  }
}

export {
  createRoadmap,
  deleteRoadmap,
  generateRoadmap,
  getRoadmapById,
  listRoadmaps,
  toggleRoadmapPin,
  updateRoadmap,
  updateRoadmapProgress,
  updateRoadmapStatus,
};
