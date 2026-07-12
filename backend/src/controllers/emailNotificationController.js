import nodemailer from "nodemailer";
import EmailCampaign from "../models/EmailCampaign.js";

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

function emailLooksOkay(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(email).toLowerCase());
}

function bool(value) {
  return String(value || "").toLowerCase() === "true";
}

function getEmailConfig() {
  const smtpReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  const sendgridReady = Boolean(process.env.SENDGRID_API_KEY);
  const mailgunReady = Boolean(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN);
  return {
    provider: process.env.EMAIL_PROVIDER || (smtpReady ? "smtp" : "mock"),
    smtpReady,
    sendgridReady,
    mailgunReady,
    mockMode: !(smtpReady || sendgridReady || mailgunReady),
    fromName: process.env.EMAIL_FROM_NAME || "NAXORA Institute OS",
    fromAddress: process.env.EMAIL_FROM_ADDRESS || "no-reply@naxora.local",
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpSecure: bool(process.env.SMTP_SECURE),
  };
}

function defaultProvider() {
  const cfg = getEmailConfig();
  if (cfg.smtpReady) return "smtp";
  if (cfg.sendgridReady) return "sendgrid";
  if (cfg.mailgunReady) return "mailgun";
  return "mock";
}

function buildPayload(body, user) {
  const cfg = getEmailConfig();
  const targetAudience = enumValue(body.targetAudience, ["all", "students", "parents", "teachers", "staff", "batch", "single"], "students");
  return {
    title: clean(body.title),
    subject: clean(body.subject),
    body: clean(body.body),
    provider: enumValue(body.provider, ["mock", "smtp", "sendgrid", "mailgun", "other"], defaultProvider()),
    templateType: enumValue(body.templateType, ["general", "fees", "attendance", "exam", "holiday", "homework", "admission", "followup", "payment", "certificate", "result"], "general"),
    targetAudience,
    targetName: clean(body.targetName),
    targetEmail: clean(body.targetEmail).toLowerCase(),
    targetBatch: clean(body.targetBatch),
    fromName: clean(body.fromName) || cfg.fromName,
    fromEmail: clean(body.fromEmail).toLowerCase() || cfg.fromAddress,
    replyTo: clean(body.replyTo).toLowerCase(),
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
  if (!payload.title) return "Email campaign title required hai";
  if (!payload.subject) return "Email subject required hai";
  if (!payload.body) return "Email body required hai";
  if (payload.targetAudience === "single" && !emailLooksOkay(payload.targetEmail)) return "Single email ke liye valid target email required hai";
  if (payload.targetAudience === "batch" && !payload.targetBatch) return "Batch email ke liye batch name required hai";
  if (payload.status === "scheduled" && !payload.scheduledAt) return "Scheduled email ke liye date/time required hai";
  if (payload.fromEmail && payload.fromEmail !== "no-reply@naxora.local" && !emailLooksOkay(payload.fromEmail)) return "Valid from email required hai";
  if (payload.replyTo && !emailLooksOkay(payload.replyTo)) return "Valid reply-to email required hai";
  return "";
}

function toResponse(item) {
  return {
    id: item._id,
    title: item.title,
    subject: item.subject,
    body: item.body,
    provider: item.provider,
    templateType: item.templateType,
    targetAudience: item.targetAudience,
    targetName: item.targetName,
    targetEmail: item.targetEmail,
    targetBatch: item.targetBatch,
    fromName: item.fromName,
    fromEmail: item.fromEmail,
    replyTo: item.replyTo,
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

async function sendEmailViaProvider(campaign, toEmail) {
  const cfg = getEmailConfig();
  const to = clean(toEmail || campaign.targetEmail).toLowerCase();
  if (!emailLooksOkay(to)) {
    return { status: "skipped", provider: campaign.provider, errorMessage: "Invalid test email" };
  }

  if (campaign.provider === "smtp" && cfg.smtpReady) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: bool(process.env.SMTP_SECURE),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    const info = await transporter.sendMail({
      from: `"${campaign.fromName || cfg.fromName}" <${campaign.fromEmail || cfg.fromAddress}>`,
      to,
      replyTo: campaign.replyTo || campaign.fromEmail || cfg.fromAddress,
      subject: campaign.subject,
      text: campaign.body,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;white-space:pre-wrap">${campaign.body.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</div>`,
    });
    return { status: "sent", provider: "smtp", providerMessageId: info.messageId || "smtp-sent" };
  }

  // SendGrid/Mailgun ke liye structure ready hai. Keys hone par yahan provider SDK/API add kar sakte ho.
  return { status: "mock_sent", provider: "mock", providerMessageId: `mock_email_${Date.now()}` };
}

export async function getEmailNotificationConfig(req, res, next) {
  try {
    res.json({
      success: true,
      config: getEmailConfig(),
      requiredEnv: [
        "EMAIL_PROVIDER=mock|smtp|sendgrid|mailgun",
        "EMAIL_FROM_NAME=NAXORA Institute OS",
        "EMAIL_FROM_ADDRESS=no-reply@yourdomain.com",
        "SMTP_HOST=smtp.gmail.com / smtp.hostinger.com / etc",
        "SMTP_PORT=587",
        "SMTP_USER=your email username",
        "SMTP_PASS=app password / smtp password",
      ],
      message: "Keys blank hain to mock mode active rahega, app crash nahi karega.",
    });
  } catch (error) {
    next(error);
  }
}

export async function listEmailNotifications(req, res, next) {
  try {
    const { search = "", status = "", provider = "", templateType = "", audience = "" } = req.query;
    const filter = { createdBy: req.user._id };
    if (status) filter.status = status;
    if (provider) filter.provider = provider;
    if (templateType) filter.templateType = templateType;
    if (audience) filter.targetAudience = audience;
    if (search) {
      const safe = clean(search);
      filter.$or = [
        { title: new RegExp(safe, "i") },
        { subject: new RegExp(safe, "i") },
        { body: new RegExp(safe, "i") },
        { targetName: new RegExp(safe, "i") },
        { targetEmail: new RegExp(safe, "i") },
        { targetBatch: new RegExp(safe, "i") },
        { tags: new RegExp(safe, "i") },
      ];
    }
    const emails = await EmailCampaign.find(filter).sort({ updatedAt: -1 }).limit(300);
    const all = await EmailCampaign.find({ createdBy: req.user._id }).select("status provider sentCount failedCount");
    res.json({
      success: true,
      emails: emails.map(toResponse),
      totalEmails: all.length,
      sentEmails: all.filter((item) => item.status === "sent").length,
      scheduledEmails: all.filter((item) => item.status === "scheduled").length,
      failedEmails: all.filter((item) => item.status === "failed").length,
      totalSentCount: all.reduce((sum, item) => sum + Number(item.sentCount || 0), 0),
      totalFailedCount: all.reduce((sum, item) => sum + Number(item.failedCount || 0), 0),
    });
  } catch (error) {
    next(error);
  }
}

export async function createEmailNotification(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const message = validatePayload(payload);
    if (message) return res.status(400).json({ success: false, message });
    const email = await EmailCampaign.create(payload);
    res.status(201).json({ success: true, message: "Email campaign save ho gayi", email: toResponse(email) });
  } catch (error) {
    next(error);
  }
}

export async function getEmailNotificationById(req, res, next) {
  try {
    const email = await EmailCampaign.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!email) return res.status(404).json({ success: false, message: "Email campaign not found" });
    res.json({ success: true, email: toResponse(email) });
  } catch (error) {
    next(error);
  }
}

export async function updateEmailNotification(req, res, next) {
  try {
    const email = await EmailCampaign.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!email) return res.status(404).json({ success: false, message: "Email campaign not found" });
    const payload = buildPayload(req.body, req.user);
    const message = validatePayload(payload);
    if (message) return res.status(400).json({ success: false, message });
    Object.assign(email, payload);
    await email.save();
    res.json({ success: true, message: "Email campaign update ho gayi", email: toResponse(email) });
  } catch (error) {
    next(error);
  }
}

export async function updateEmailNotificationStatus(req, res, next) {
  try {
    const email = await EmailCampaign.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!email) return res.status(404).json({ success: false, message: "Email campaign not found" });
    const status = enumValue(req.body.status, ["draft", "scheduled", "queued", "sent", "failed", "cancelled"], email.status);
    email.status = status;
    if (status === "sent") {
      email.sentAt = new Date();
      email.sentCount = Math.max(email.sentCount || 0, email.estimatedRecipients || 1);
      email.lastSendStatus = "Marked as sent manually";
    }
    if (status === "failed") {
      email.failedCount = Math.max(email.failedCount || 0, 1);
      email.lastSendStatus = "Marked as failed manually";
    }
    await email.save();
    res.json({ success: true, message: `Email status ${status} ho gaya`, email: toResponse(email) });
  } catch (error) {
    next(error);
  }
}

export async function sendTestEmailNotification(req, res, next) {
  try {
    const email = await EmailCampaign.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!email) return res.status(404).json({ success: false, message: "Email campaign not found" });
    const toEmail = clean(req.body.email || email.targetEmail).toLowerCase();
    if (!emailLooksOkay(toEmail)) return res.status(400).json({ success: false, message: "Valid test email address required hai" });

    try {
      const result = await sendEmailViaProvider(email, toEmail);
      email.deliveryLogs.push({
        email: toEmail,
        status: result.status,
        provider: result.provider,
        providerMessageId: result.providerMessageId || "",
        errorMessage: result.errorMessage || "",
        sentAt: ["sent", "mock_sent"].includes(result.status) ? new Date() : undefined,
      });
      if (["sent", "mock_sent"].includes(result.status)) {
        email.status = "sent";
        email.sentAt = new Date();
        email.sentCount += 1;
        email.lastSendStatus = result.status === "mock_sent" ? "Mock test email sent. SMTP keys add karoge to real email jayega." : "SMTP test email sent successfully.";
      } else {
        email.status = "failed";
        email.failedCount += 1;
        email.lastSendStatus = result.errorMessage || "Email send failed";
      }
      await email.save();
      res.json({ success: true, message: email.lastSendStatus, email: toResponse(email), config: getEmailConfig() });
    } catch (sendError) {
      email.status = "failed";
      email.failedCount += 1;
      email.lastSendStatus = sendError.message || "SMTP send failed";
      email.deliveryLogs.push({ email: toEmail, status: "failed", provider: email.provider, errorMessage: email.lastSendStatus });
      await email.save();
      res.status(500).json({ success: false, message: email.lastSendStatus, email: toResponse(email) });
    }
  } catch (error) {
    next(error);
  }
}

export async function deleteEmailNotification(req, res, next) {
  try {
    const email = await EmailCampaign.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!email) return res.status(404).json({ success: false, message: "Email campaign not found" });
    res.json({ success: true, message: "Email campaign delete ho gayi" });
  } catch (error) {
    next(error);
  }
}
