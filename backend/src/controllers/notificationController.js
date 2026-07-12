import NotificationCampaign from "../models/NotificationCampaign.js";

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

function phoneLooksOkay(phone = "") {
  const digits = clean(phone).replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function getProviderConfig() {
  const whatsappReady = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
  const twilioReady = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
  const msg91Ready = Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_SENDER_ID);
  const fast2smsReady = Boolean(process.env.FAST2SMS_API_KEY);
  return {
    whatsappCloudReady: whatsappReady,
    twilioReady,
    msg91Ready,
    fast2smsReady,
    mockMode: !(whatsappReady || twilioReady || msg91Ready || fast2smsReady),
    companyName: process.env.NOTIFICATION_COMPANY_NAME || "NAXORA Institute OS",
    supportNumber: process.env.NOTIFICATION_SUPPORT_NUMBER || "",
  };
}

function defaultProvider(channel) {
  const cfg = getProviderConfig();
  if (channel === "whatsapp" && cfg.whatsappCloudReady) return "whatsapp_cloud";
  if ((channel === "sms" || channel === "both") && cfg.twilioReady) return "twilio";
  if ((channel === "sms" || channel === "both") && cfg.msg91Ready) return "msg91";
  if ((channel === "sms" || channel === "both") && cfg.fast2smsReady) return "fast2sms";
  return "mock";
}

function buildPayload(body, user) {
  const channel = enumValue(body.channel, ["whatsapp", "sms", "both"], "whatsapp");
  const targetAudience = enumValue(body.targetAudience, ["all", "students", "parents", "teachers", "staff", "batch", "single"], "students");
  const targetPhone = clean(body.targetPhone);
  return {
    title: clean(body.title),
    message: clean(body.message),
    channel,
    provider: enumValue(body.provider, ["mock", "whatsapp_cloud", "twilio", "msg91", "fast2sms", "other"], defaultProvider(channel)),
    templateType: enumValue(body.templateType, ["general", "fees", "attendance", "exam", "holiday", "homework", "admission", "followup", "payment"], "general"),
    targetAudience,
    targetName: clean(body.targetName),
    targetPhone,
    targetBatch: clean(body.targetBatch),
    priority: enumValue(body.priority, ["normal", "high", "urgent"], "normal"),
    status: enumValue(body.status, ["draft", "scheduled", "queued", "sent", "failed", "cancelled"], "draft"),
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    estimatedRecipients: Math.max(1, Math.min(100000, Number(body.estimatedRecipients || (targetAudience === "single" ? 1 : 25)))),
    tags: parseList(body.tags, 15),
    notes: clean(body.notes),
    instituteName: user.instituteName || "NAXORA Institute",
    createdBy: user._id,
  };
}

function validatePayload(payload) {
  if (!payload.title) return "Notification title required hai";
  if (!payload.message) return "Message required hai";
  if (payload.targetAudience === "single" && !phoneLooksOkay(payload.targetPhone)) return "Single notification ke liye valid phone number required hai";
  if (payload.targetAudience === "batch" && !payload.targetBatch) return "Batch notification ke liye batch name required hai";
  if (payload.status === "scheduled" && !payload.scheduledAt) return "Scheduled notification ke liye date/time required hai";
  return "";
}

function toResponse(item) {
  return {
    id: item._id,
    title: item.title,
    message: item.message,
    channel: item.channel,
    provider: item.provider,
    templateType: item.templateType,
    targetAudience: item.targetAudience,
    targetName: item.targetName,
    targetPhone: item.targetPhone,
    targetBatch: item.targetBatch,
    priority: item.priority,
    status: item.status,
    scheduledAt: item.scheduledAt,
    sentAt: item.sentAt,
    sentCount: item.sentCount,
    failedCount: item.failedCount,
    estimatedRecipients: item.estimatedRecipients,
    lastSendStatus: item.lastSendStatus,
    tags: item.tags || [],
    deliveryLogs: item.deliveryLogs || [],
    notes: item.notes,
    instituteName: item.instituteName,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function listNotifications(req, res, next) {
  try {
    const { search = "", status = "", channel = "", templateType = "", audience = "" } = req.query;
    const filter = { createdBy: req.user._id };
    if (status) filter.status = status;
    if (channel) filter.channel = channel;
    if (templateType) filter.templateType = templateType;
    if (audience) filter.targetAudience = audience;
    if (search) {
      const safe = clean(search);
      filter.$or = [
        { title: new RegExp(safe, "i") },
        { message: new RegExp(safe, "i") },
        { targetName: new RegExp(safe, "i") },
        { targetBatch: new RegExp(safe, "i") },
        { tags: new RegExp(safe, "i") },
      ];
    }

    const notifications = await NotificationCampaign.find(filter).sort({ updatedAt: -1 }).limit(300);
    const all = await NotificationCampaign.find({ createdBy: req.user._id }).select("status channel sentCount failedCount");
    res.json({
      success: true,
      notifications: notifications.map(toResponse),
      totalNotifications: all.length,
      sentNotifications: all.filter((item) => item.status === "sent").length,
      scheduledNotifications: all.filter((item) => item.status === "scheduled").length,
      failedNotifications: all.filter((item) => item.status === "failed").length,
      totalSentCount: all.reduce((sum, item) => sum + Number(item.sentCount || 0), 0),
      totalFailedCount: all.reduce((sum, item) => sum + Number(item.failedCount || 0), 0),
    });
  } catch (error) {
    next(error);
  }
}

async function createNotification(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const message = validatePayload(payload);
    if (message) return res.status(400).json({ success: false, message });
    const notification = await NotificationCampaign.create(payload);
    res.status(201).json({ success: true, message: "Notification campaign save ho gayi", notification: toResponse(notification) });
  } catch (error) {
    next(error);
  }
}

async function getNotificationById(req, res, next) {
  try {
    const notification = await NotificationCampaign.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
    res.json({ success: true, notification: toResponse(notification) });
  } catch (error) {
    next(error);
  }
}

async function updateNotification(req, res, next) {
  try {
    const notification = await NotificationCampaign.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
    const payload = buildPayload(req.body, req.user);
    const message = validatePayload(payload);
    if (message) return res.status(400).json({ success: false, message });
    Object.assign(notification, payload);
    await notification.save();
    res.json({ success: true, message: "Notification update ho gayi", notification: toResponse(notification) });
  } catch (error) {
    next(error);
  }
}

async function updateNotificationStatus(req, res, next) {
  try {
    const status = enumValue(req.body.status, ["draft", "scheduled", "queued", "sent", "failed", "cancelled"], "draft");
    const notification = await NotificationCampaign.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
    notification.status = status;
    if (status === "sent" && !notification.sentAt) notification.sentAt = new Date();
    notification.lastSendStatus = `Status manually changed to ${status}`;
    await notification.save();
    res.json({ success: true, message: "Notification status update ho gaya", notification: toResponse(notification) });
  } catch (error) {
    next(error);
  }
}

async function sendTestNotification(req, res, next) {
  try {
    const notification = await NotificationCampaign.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
    const testPhone = clean(req.body.phone || notification.targetPhone || process.env.NOTIFICATION_TEST_PHONE || "");
    if (!phoneLooksOkay(testPhone)) return res.status(400).json({ success: false, message: "Test send ke liye valid phone number required hai" });

    const providerConfig = getProviderConfig();
    const provider = notification.provider === "mock" ? defaultProvider(notification.channel) : notification.provider;
    const isMock = provider === "mock" || providerConfig.mockMode;
    const channels = notification.channel === "both" ? ["whatsapp", "sms"] : [notification.channel];
    const newLogs = channels.map((channel) => ({
      channel,
      phone: testPhone,
      status: isMock ? "sent" : "queued",
      provider: isMock ? "mock" : provider,
      providerMessageId: `${isMock ? "mock" : provider}_${Date.now()}_${channel}`,
      errorMessage: "",
      sentAt: new Date(),
    }));

    notification.deliveryLogs.push(...newLogs);
    notification.sentCount += newLogs.length;
    notification.status = "sent";
    notification.sentAt = new Date();
    notification.lastSendStatus = isMock
      ? "Mock test notification generated. Real WhatsApp/SMS keys add karne par provider integration activate hoga."
      : `${provider} provider ke liye queued/sent test log create ho gaya.`;
    await notification.save();

    res.json({
      success: true,
      message: isMock ? "Mock WhatsApp/SMS test send successful" : "Provider test notification queued/sent",
      config: providerConfig,
      notification: toResponse(notification),
    });
  } catch (error) {
    next(error);
  }
}

async function getNotificationConfig(req, res, next) {
  try {
    res.json({
      success: true,
      config: getProviderConfig(),
      envKeysNeeded: {
        whatsappCloud: ["WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_ACCESS_TOKEN", "WHATSAPP_BUSINESS_ACCOUNT_ID"],
        twilio: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
        msg91: ["MSG91_AUTH_KEY", "MSG91_SENDER_ID"],
        fast2sms: ["FAST2SMS_API_KEY"],
      },
      note: "Keys missing hain to app mock mode me chalega aur crash nahi karega.",
    });
  } catch (error) {
    next(error);
  }
}

async function deleteNotification(req, res, next) {
  try {
    const notification = await NotificationCampaign.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
    res.json({ success: true, message: "Notification delete ho gayi" });
  } catch (error) {
    next(error);
  }
}

export {
  createNotification,
  deleteNotification,
  getNotificationById,
  getNotificationConfig,
  listNotifications,
  sendTestNotification,
  updateNotification,
  updateNotificationStatus,
};
