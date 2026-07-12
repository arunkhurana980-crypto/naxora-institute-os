import LibraryItem from "../models/LibraryItem.js";

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

function dateValue(value, fallback = undefined) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function buildPayload(body, user) {
  const format = enumValue(body.format, ["physical", "digital", "both"], "digital");
  const totalCopies = numberValue(body.totalCopies, format === "digital" ? 1 : 0);
  const availableCopies = numberValue(body.availableCopies, totalCopies);

  return {
    materialType: enumValue(body.materialType, ["book", "pdf", "video", "link", "notes", "assignment", "other"], "book"),
    title: clean(body.title),
    subject: clean(body.subject),
    topic: clean(body.topic),
    author: clean(body.author),
    courseName: clean(body.courseName),
    batchName: clean(body.batchName),
    classLevel: clean(body.classLevel),
    language: enumValue(body.language, ["Hindi", "English", "Hinglish", "Other"], "Hinglish"),
    difficulty: enumValue(body.difficulty, ["basic", "medium", "advanced", "expert"], "basic"),
    format,
    materialUrl: clean(body.materialUrl),
    storageLocation: clean(body.storageLocation),
    totalCopies,
    availableCopies: Math.min(availableCopies, totalCopies || availableCopies),
    tags: clean(body.tags),
    status: enumValue(body.status, ["active", "archived", "draft"], "active"),
    accessLevel: enumValue(body.accessLevel, ["all", "students", "teachers", "batch-only", "admin-only"], "students"),
    description: clean(body.description),
    createdBy: user._id,
  };
}

function validatePayload(payload) {
  if (!payload.title) return "Material title required hai";
  if (!payload.subject) return "Subject required hai";
  if (["pdf", "video", "link"].includes(payload.materialType) && payload.materialUrl && !/^https?:\/\//i.test(payload.materialUrl)) {
    return "Material URL http:// ya https:// se start hona chahiye";
  }
  if ((payload.format === "physical" || payload.format === "both") && payload.totalCopies < payload.availableCopies) {
    return "Available copies total copies se zyada nahi ho sakti";
  }
  return "";
}

function toResponse(item) {
  return {
    id: item._id,
    materialType: item.materialType,
    title: item.title,
    subject: item.subject,
    topic: item.topic,
    author: item.author,
    courseName: item.courseName,
    batchName: item.batchName,
    classLevel: item.classLevel,
    language: item.language,
    difficulty: item.difficulty,
    format: item.format,
    materialUrl: item.materialUrl,
    storageLocation: item.storageLocation,
    totalCopies: item.totalCopies,
    availableCopies: item.availableCopies,
    tags: item.tags,
    status: item.status,
    accessLevel: item.accessLevel,
    description: item.description,
    issueRecords: (item.issueRecords || []).map((record) => ({
      id: record._id,
      studentName: record.studentName,
      studentEmail: record.studentEmail,
      rollNo: record.rollNo,
      issueDate: record.issueDate,
      returnDate: record.returnDate,
      status: record.status,
      note: record.note,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function createLibraryItem(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const item = await LibraryItem.create(payload);
    res.status(201).json({ success: true, message: "Library material add ho gaya", item: toResponse(item) });
  } catch (error) {
    next(error);
  }
}

export async function getLibraryItems(req, res, next) {
  try {
    const { search = "", materialType = "", status = "", format = "", difficulty = "", subject = "" } = req.query;
    const owner = { createdBy: req.user._id };
    const filter = { ...owner };

    if (materialType.trim()) filter.materialType = materialType.trim();
    if (status.trim()) filter.status = status.trim();
    if (format.trim()) filter.format = format.trim();
    if (difficulty.trim()) filter.difficulty = difficulty.trim();
    if (subject.trim()) filter.subject = new RegExp(subject.trim(), "i");

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { title: regex },
        { subject: regex },
        { topic: regex },
        { author: regex },
        { courseName: regex },
        { batchName: regex },
        { tags: regex },
      ];
    }

    const items = await LibraryItem.find(filter).sort({ createdAt: -1 }).limit(180);
    const all = await LibraryItem.find(owner).select("materialType status format availableCopies totalCopies issueRecords subject");

    const summary = all.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.materialType] = (acc[item.materialType] || 0) + 1;
        acc[item.status] = (acc[item.status] || 0) + 1;
        acc[item.format] = (acc[item.format] || 0) + 1;
        acc.totalCopies += Number(item.totalCopies || 0);
        acc.availableCopies += Number(item.availableCopies || 0);
        acc.subjects.add(item.subject);
        for (const record of item.issueRecords || []) {
          if (record.status === "issued") acc.issued += 1;
          if (record.status === "overdue") acc.overdue += 1;
          if (record.status === "returned") acc.returned += 1;
          if (record.status === "lost") acc.lost += 1;
        }
        return acc;
      },
      { total: 0, active: 0, archived: 0, draft: 0, book: 0, pdf: 0, video: 0, link: 0, notes: 0, assignment: 0, other: 0, physical: 0, digital: 0, both: 0, totalCopies: 0, availableCopies: 0, issued: 0, overdue: 0, returned: 0, lost: 0, subjects: new Set() }
    );

    res.json({
      success: true,
      count: items.length,
      totalMaterials: summary.total,
      activeCount: summary.active,
      archivedCount: summary.archived,
      draftCount: summary.draft,
      bookCount: summary.book,
      pdfCount: summary.pdf,
      videoCount: summary.video,
      linkCount: summary.link,
      notesCount: summary.notes,
      physicalCount: summary.physical,
      digitalCount: summary.digital,
      totalCopies: summary.totalCopies,
      availableCopies: summary.availableCopies,
      issuedCount: summary.issued,
      overdueCount: summary.overdue,
      returnedCount: summary.returned,
      lostCount: summary.lost,
      subjectCount: summary.subjects.size,
      items: items.map(toResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function getLibraryItemById(req, res, next) {
  try {
    const item = await LibraryItem.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: "Library material nahi mila" });
    res.json({ success: true, item: toResponse(item) });
  } catch (error) {
    next(error);
  }
}

export async function updateLibraryItem(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    delete payload.createdBy;
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const item = await LibraryItem.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ success: false, message: "Library material nahi mila" });
    res.json({ success: true, message: "Library material update ho gaya", item: toResponse(item) });
  } catch (error) {
    next(error);
  }
}

export async function updateLibraryItemStatus(req, res, next) {
  try {
    const status = enumValue(req.body.status, ["active", "archived", "draft"], "active");
    const item = await LibraryItem.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ success: false, message: "Library material nahi mila" });
    res.json({ success: true, message: `Material status ${status} ho gaya`, item: toResponse(item) });
  } catch (error) {
    next(error);
  }
}

export async function issueLibraryItem(req, res, next) {
  try {
    const item = await LibraryItem.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: "Library material nahi mila" });
    if ((item.format === "physical" || item.format === "both") && item.availableCopies <= 0) {
      return res.status(400).json({ success: false, message: "Available copy nahi bachi" });
    }

    const studentName = clean(req.body.studentName);
    if (!studentName) return res.status(400).json({ success: false, message: "Student name required hai" });

    item.issueRecords.push({
      studentName,
      studentEmail: clean(req.body.studentEmail).toLowerCase(),
      rollNo: clean(req.body.rollNo),
      issueDate: dateValue(req.body.issueDate, new Date()),
      returnDate: dateValue(req.body.returnDate),
      status: enumValue(req.body.status, ["issued", "returned", "overdue", "lost"], "issued"),
      note: clean(req.body.note),
    });

    if ((item.format === "physical" || item.format === "both") && item.availableCopies > 0) {
      item.availableCopies -= 1;
    }

    await item.save();
    res.json({ success: true, message: "Material issue ho gaya", item: toResponse(item) });
  } catch (error) {
    next(error);
  }
}

export async function updateIssueRecord(req, res, next) {
  try {
    const item = await LibraryItem.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: "Library material nahi mila" });
    const record = item.issueRecords.id(req.params.recordId);
    if (!record) return res.status(404).json({ success: false, message: "Issue record nahi mila" });

    const oldStatus = record.status;
    const newStatus = enumValue(req.body.status, ["issued", "returned", "overdue", "lost"], record.status || "issued");
    record.status = newStatus;
    record.returnDate = dateValue(req.body.returnDate, record.returnDate);
    record.note = clean(req.body.note) || record.note;

    if ((item.format === "physical" || item.format === "both") && oldStatus !== "returned" && newStatus === "returned") {
      item.availableCopies = Math.min(Number(item.availableCopies || 0) + 1, Number(item.totalCopies || 0));
    }

    await item.save();
    res.json({ success: true, message: "Issue record update ho gaya", item: toResponse(item) });
  } catch (error) {
    next(error);
  }
}

export async function deleteLibraryItem(req, res, next) {
  try {
    const item = await LibraryItem.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: "Library material nahi mila" });
    res.json({ success: true, message: "Library material delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
