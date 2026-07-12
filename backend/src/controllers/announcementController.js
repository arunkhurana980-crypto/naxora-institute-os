import Announcement from "../models/Announcement.js";

function clean(value = "") {
  return String(value || "").trim();
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function dateValue(value, fallback = null) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function buildPayload(body, user) {
  const targetAudience = enumValue(body.targetAudience, ["all", "students", "teachers", "parents", "batch", "staff"], "all");
  return {
    title: clean(body.title),
    message: clean(body.message),
    category: enumValue(body.category, ["general", "fees", "attendance", "exam", "holiday", "homework", "event"], "general"),
    priority: enumValue(body.priority, ["normal", "high", "urgent"], "normal"),
    targetAudience,
    batchName: targetAudience === "batch" ? clean(body.batchName) : clean(body.batchName),
    status: enumValue(body.status, ["draft", "published", "archived"], "published"),
    publishAt: dateValue(body.publishAt, new Date()),
    expiryDate: dateValue(body.expiryDate, undefined),
    actionLabel: clean(body.actionLabel),
    actionLink: clean(body.actionLink),
    instituteName: user.instituteName || "NAXORA Institute",
    createdBy: user._id,
  };
}

function validatePayload(payload) {
  if (!payload.title) return "Announcement title required hai";
  if (!payload.message) return "Announcement message required hai";
  if (payload.targetAudience === "batch" && !payload.batchName) return "Batch notice ke liye batch name required hai";
  if (payload.actionLink && !/^https?:\/\//i.test(payload.actionLink)) return "Action link http:// ya https:// se start hona chahiye";
  return "";
}

function isReadByUser(item, userId) {
  return (item.readBy || []).some((read) => String(read.userId) === String(userId));
}

function toAnnouncementResponse(item, userId) {
  return {
    id: item._id,
    title: item.title,
    message: item.message,
    category: item.category,
    priority: item.priority,
    targetAudience: item.targetAudience,
    batchName: item.batchName,
    status: item.status,
    publishAt: item.publishAt,
    expiryDate: item.expiryDate,
    actionLabel: item.actionLabel,
    actionLink: item.actionLink,
    readCount: item.readBy?.length || 0,
    isRead: isReadByUser(item, userId),
    instituteName: item.instituteName,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function createAnnouncement(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const validationError = validatePayload(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const announcement = await Announcement.create(payload);
    res.status(201).json({ success: true, message: "Announcement create ho gaya", announcement: toAnnouncementResponse(announcement, req.user._id) });
  } catch (error) {
    next(error);
  }
}

export async function getAnnouncements(req, res, next) {
  try {
    const { search = "", category = "", priority = "", status = "", targetAudience = "" } = req.query;
    const owner = { createdBy: req.user._id };
    const filter = { ...owner };

    if (category.trim()) filter.category = category.trim();
    if (priority.trim()) filter.priority = priority.trim();
    if (status.trim()) filter.status = status.trim();
    if (targetAudience.trim()) filter.targetAudience = targetAudience.trim();

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { title: regex },
        { message: regex },
        { batchName: regex },
        { category: regex },
      ];
    }

    const announcements = await Announcement.find(filter).sort({ priority: -1, publishAt: -1, createdAt: -1 }).limit(120);
    const all = await Announcement.find(owner).select("status priority targetAudience category readBy expiryDate publishAt");
    const now = new Date();

    const summary = all.reduce(
      (acc, item) => {
        acc.totalAnnouncements += 1;
        acc[item.status] = (acc[item.status] || 0) + 1;
        if (item.priority === "urgent") acc.urgentAnnouncements += 1;
        if (item.priority === "high") acc.highAnnouncements += 1;
        if (item.expiryDate && item.expiryDate < now) acc.expiredAnnouncements += 1;
        if (item.publishAt && item.publishAt > now) acc.scheduledAnnouncements += 1;
        acc.readRows += item.readBy?.length || 0;
        acc.categories.add(item.category);
        acc.audiences.add(item.targetAudience);
        return acc;
      },
      {
        totalAnnouncements: 0,
        draft: 0,
        published: 0,
        archived: 0,
        urgentAnnouncements: 0,
        highAnnouncements: 0,
        expiredAnnouncements: 0,
        scheduledAnnouncements: 0,
        readRows: 0,
        categories: new Set(),
        audiences: new Set(),
      }
    );

    res.json({
      success: true,
      count: announcements.length,
      totalAnnouncements: summary.totalAnnouncements,
      publishedAnnouncements: summary.published,
      draftAnnouncements: summary.draft,
      archivedAnnouncements: summary.archived,
      urgentAnnouncements: summary.urgentAnnouncements,
      highAnnouncements: summary.highAnnouncements,
      expiredAnnouncements: summary.expiredAnnouncements,
      scheduledAnnouncements: summary.scheduledAnnouncements,
      readRows: summary.readRows,
      categoryCount: summary.categories.size,
      audienceCount: summary.audiences.size,
      announcements: announcements.map((item) => toAnnouncementResponse(item, req.user._id)),
    });
  } catch (error) {
    next(error);
  }
}

export async function getAnnouncementById(req, res, next) {
  try {
    const announcement = await Announcement.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!announcement) return res.status(404).json({ success: false, message: "Announcement nahi mila" });
    res.json({ success: true, announcement: toAnnouncementResponse(announcement, req.user._id) });
  } catch (error) {
    next(error);
  }
}

export async function updateAnnouncement(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    delete payload.createdBy;
    const validationError = validatePayload(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const announcement = await Announcement.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );

    if (!announcement) return res.status(404).json({ success: false, message: "Announcement nahi mila" });
    res.json({ success: true, message: "Announcement update ho gaya", announcement: toAnnouncementResponse(announcement, req.user._id) });
  } catch (error) {
    next(error);
  }
}

export async function updateAnnouncementStatus(req, res, next) {
  try {
    const status = enumValue(req.body.status, ["draft", "published", "archived"], "published");
    const announcement = await Announcement.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status },
      { new: true, runValidators: true }
    );

    if (!announcement) return res.status(404).json({ success: false, message: "Announcement nahi mila" });
    res.json({ success: true, message: `Announcement status ${status} ho gaya`, announcement: toAnnouncementResponse(announcement, req.user._id) });
  } catch (error) {
    next(error);
  }
}

export async function markAnnouncementRead(req, res, next) {
  try {
    const announcement = await Announcement.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!announcement) return res.status(404).json({ success: false, message: "Announcement nahi mila" });

    if (!isReadByUser(announcement, req.user._id)) {
      announcement.readBy.push({ userId: req.user._id, readAt: new Date() });
      await announcement.save();
    }

    res.json({ success: true, message: "Announcement read mark ho gaya", announcement: toAnnouncementResponse(announcement, req.user._id) });
  } catch (error) {
    next(error);
  }
}

export async function deleteAnnouncement(req, res, next) {
  try {
    const announcement = await Announcement.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!announcement) return res.status(404).json({ success: false, message: "Announcement nahi mila" });
    res.json({ success: true, message: "Announcement delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
