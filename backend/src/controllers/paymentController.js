import crypto from "crypto";
import Razorpay from "razorpay";
import PaymentRecord from "../models/PaymentRecord.js";

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

function dateValue(value, fallback = null) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function buildMetadata(input = {}) {
  const metadata = {};
  Object.entries(input || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    metadata[clean(key)] = clean(value);
  });
  return metadata;
}

function buildPayload(body, user) {
  return {
    paymentFor: enumValue(body.paymentFor, ["student_fees", "subscription", "admission", "certificate", "library", "other"], "student_fees"),
    payerName: clean(body.payerName),
    payerPhone: clean(body.payerPhone),
    payerEmail: clean(body.payerEmail).toLowerCase(),
    studentName: clean(body.studentName),
    instituteName: clean(body.instituteName || user.instituteName || "NAXORA Institute"),
    relatedRecordId: clean(body.relatedRecordId),
    title: clean(body.title),
    amount: numberValue(body.amount),
    currency: clean(body.currency || "INR").toUpperCase(),
    provider: enumValue(body.provider, ["razorpay", "upi", "cash", "bank", "card", "manual", "other"], "razorpay"),
    paymentMode: enumValue(body.paymentMode, ["online", "upi", "cash", "bank", "card", "other"], "online"),
    status: enumValue(body.status, ["created", "pending", "paid", "failed", "refunded", "cancelled"], "created"),
    providerOrderId: clean(body.providerOrderId),
    providerPaymentId: clean(body.providerPaymentId),
    providerSignature: clean(body.providerSignature),
    upiId: clean(body.upiId),
    transactionRef: clean(body.transactionRef),
    receiptNumber: clean(body.receiptNumber),
    receiptUrl: clean(body.receiptUrl),
    receiptNote: clean(body.receiptNote),
    dueDate: dateValue(body.dueDate),
    paidAt: dateValue(body.paidAt),
    metadata: buildMetadata(body.metadata),
    createdBy: user._id,
  };
}

function validatePayload(payload) {
  if (!payload.payerName) return "Payer name required hai";
  if (!payload.title) return "Payment title required hai";
  if (!payload.amount || payload.amount <= 0) return "Amount 0 se zyada hona chahiye";
  return "";
}

function toResponse(record) {
  return {
    id: record._id,
    paymentFor: record.paymentFor,
    payerName: record.payerName,
    payerPhone: record.payerPhone,
    payerEmail: record.payerEmail,
    studentName: record.studentName,
    instituteName: record.instituteName,
    relatedRecordId: record.relatedRecordId,
    title: record.title,
    amount: record.amount,
    currency: record.currency,
    provider: record.provider,
    paymentMode: record.paymentMode,
    status: record.status,
    providerOrderId: record.providerOrderId,
    providerPaymentId: record.providerPaymentId,
    upiId: record.upiId,
    transactionRef: record.transactionRef,
    receiptNumber: record.receiptNumber,
    receiptUrl: record.receiptUrl,
    receiptNote: record.receiptNote,
    dueDate: record.dueDate,
    paidAt: record.paidAt,
    events: record.events,
    metadata: record.metadata ? Object.fromEntries(record.metadata) : {},
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function buildSummary(ownerFilter) {
  const records = await PaymentRecord.find(ownerFilter).select("amount status provider paymentFor paymentMode paidAt createdAt");
  return records.reduce(
    (acc, record) => {
      const amount = Number(record.amount || 0);
      acc.totalRecords += 1;
      acc[record.status] = (acc[record.status] || 0) + 1;
      acc.byProvider[record.provider] = (acc.byProvider[record.provider] || 0) + amount;
      acc.byPurpose[record.paymentFor] = (acc.byPurpose[record.paymentFor] || 0) + amount;
      if (record.status === "paid") acc.totalCollected += amount;
      if (["created", "pending"].includes(record.status)) acc.totalPending += amount;
      if (record.status === "failed") acc.failedAmount += amount;
      if (record.status === "refunded") acc.refundedAmount += amount;
      return acc;
    },
    {
      totalRecords: 0,
      created: 0,
      pending: 0,
      paid: 0,
      failed: 0,
      refunded: 0,
      cancelled: 0,
      totalCollected: 0,
      totalPending: 0,
      failedAmount: 0,
      refundedAmount: 0,
      byProvider: {},
      byPurpose: {},
    }
  );
}

function receiptId(payment) {
  const base = payment.receiptNumber || `NX-PAY-${String(payment._id).slice(-8).toUpperCase()}`;
  return base.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || `NX${Date.now()}`;
}

function makeMockOrderId() {
  return `order_NAXORA_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function hasRazorpayKeys() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function getRazorpayClient() {
  if (!hasRazorpayKeys()) return null;
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return { verified: false, reason: "RAZORPAY_KEY_SECRET missing hai" };
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return { verified: expected === signature, reason: expected === signature ? "Signature verified" : "Signature mismatch" };
}

function verifyWebhookSignature(req) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return { enabled: false, verified: true, reason: "Webhook secret missing, signature check skipped in local dev" };
  const signature = clean(req.headers["x-razorpay-signature"]);
  const body = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return { enabled: true, verified: expected === signature, reason: expected === signature ? "Webhook signature verified" : "Webhook signature mismatch" };
}

export async function getPaymentPlans(req, res) {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  res.json({
    success: true,
    razorpayKeyId: keyId,
    companyName: process.env.RAZORPAY_COMPANY_NAME || "NAXORA Institute OS",
    providerMode: hasRazorpayKeys() ? "razorpay-live-ready" : "test-mock-mode",
    supportedProviders: ["razorpay", "upi", "cash", "bank", "card", "manual"],
    paymentPurposes: ["student_fees", "subscription", "admission", "certificate", "library", "other"],
    message: hasRazorpayKeys()
      ? "Razorpay keys detected. Real Checkout order create ho sakta hai. Test mode keys se pehle test payment karo."
      : "Razorpay keys missing. Abhi mock order banega. RAZORPAY_KEY_ID aur RAZORPAY_KEY_SECRET .env me add karo.",
  });
}

export async function createPayment(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const record = await PaymentRecord.create({
      ...payload,
      events: [{ eventType: "created", message: "Payment record created" }],
    });
    res.status(201).json({ success: true, message: "Payment record create ho gaya", payment: toResponse(record) });
  } catch (error) {
    next(error);
  }
}

export async function getPayments(req, res, next) {
  try {
    const { search = "", status = "", purpose = "", provider = "", mode = "" } = req.query;
    const ownerFilter = { createdBy: req.user._id };
    const filter = { ...ownerFilter };

    if (status.trim()) filter.status = status.trim();
    if (purpose.trim()) filter.paymentFor = purpose.trim();
    if (provider.trim()) filter.provider = provider.trim();
    if (mode.trim()) filter.paymentMode = mode.trim();

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { payerName: regex },
        { payerPhone: regex },
        { payerEmail: regex },
        { studentName: regex },
        { instituteName: regex },
        { title: regex },
        { receiptNumber: regex },
        { providerOrderId: regex },
        { providerPaymentId: regex },
        { transactionRef: regex },
      ];
    }

    const payments = await PaymentRecord.find(filter).sort({ createdAt: -1 }).limit(250);
    const summary = await buildSummary(ownerFilter);

    res.json({
      success: true,
      count: payments.length,
      ...summary,
      payments: payments.map(toResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function getPaymentById(req, res, next) {
  try {
    const payment = await PaymentRecord.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!payment) return res.status(404).json({ success: false, message: "Payment record nahi mila" });
    res.json({ success: true, payment: toResponse(payment) });
  } catch (error) {
    next(error);
  }
}

export async function updatePayment(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    delete payload.createdBy;
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const payment = await PaymentRecord.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { $set: payload, $push: { events: { eventType: "updated", message: "Payment details updated" } } },
      { new: true, runValidators: true }
    );
    if (!payment) return res.status(404).json({ success: false, message: "Payment record nahi mila" });
    res.json({ success: true, message: "Payment update ho gaya", payment: toResponse(payment) });
  } catch (error) {
    next(error);
  }
}

export async function updatePaymentStatus(req, res, next) {
  try {
    const status = enumValue(req.body.status, ["created", "pending", "paid", "failed", "refunded", "cancelled"], "pending");
    const set = { status };
    if (status === "paid") set.paidAt = new Date();
    const update = {
      $set: set,
      $push: { events: { eventType: "status", message: `Status ${status} set hua` } },
    };
    const payment = await PaymentRecord.findOneAndUpdate({ _id: req.params.id, createdBy: req.user._id }, update, { new: true, runValidators: true });
    if (!payment) return res.status(404).json({ success: false, message: "Payment record nahi mila" });
    res.json({ success: true, message: `Payment status ${status} ho gaya`, payment: toResponse(payment) });
  } catch (error) {
    next(error);
  }
}

export async function createPaymentOrder(req, res, next) {
  try {
    const payment = await PaymentRecord.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!payment) return res.status(404).json({ success: false, message: "Payment record nahi mila" });

    const amountInPaise = Math.round(Number(payment.amount || 0) * 100);
    if (!amountInPaise || amountInPaise < 100) return res.status(400).json({ success: false, message: "Razorpay order ke liye amount kam se kam ₹1 hona chahiye" });

    const client = getRazorpayClient();
    let order;

    if (client) {
      order = await client.orders.create({
        amount: amountInPaise,
        currency: payment.currency || "INR",
        receipt: receiptId(payment),
        notes: {
          paymentRecordId: String(payment._id),
          paymentFor: payment.paymentFor,
          payerName: payment.payerName,
          title: payment.title,
        },
      });
      payment.events.push({ eventType: "razorpay_order_created", message: `Razorpay order created: ${order.id}` });
    } else {
      order = {
        id: payment.providerOrderId || makeMockOrderId(),
        amount: amountInPaise,
        currency: payment.currency || "INR",
        receipt: receiptId(payment),
        status: "created",
      };
      payment.events.push({ eventType: "mock_order_created", message: "Razorpay keys missing, mock order created" });
    }

    payment.provider = "razorpay";
    payment.paymentMode = "online";
    payment.status = "pending";
    payment.providerOrderId = order.id;
    await payment.save();

    res.json({
      success: true,
      message: client ? "Razorpay order created" : "Mock order created. Real Checkout ke liye .env me Razorpay keys add karo.",
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
        companyName: process.env.RAZORPAY_COMPANY_NAME || "NAXORA Institute OS",
      },
      payment: toResponse(payment),
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyPayment(req, res, next) {
  try {
    const payment = await PaymentRecord.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!payment) return res.status(404).json({ success: false, message: "Payment record nahi mila" });

    const orderId = clean(req.body.providerOrderId || req.body.razorpay_order_id || payment.providerOrderId);
    const paymentId = clean(req.body.providerPaymentId || req.body.razorpay_payment_id);
    const signature = clean(req.body.providerSignature || req.body.razorpay_signature);

    if (!orderId || !paymentId) return res.status(400).json({ success: false, message: "Order ID aur Payment ID required hain" });

    const verification = verifyRazorpaySignature({ orderId, paymentId, signature });
    const allowMockVerification = !hasRazorpayKeys() && paymentId.startsWith("pay_TEST_");

    if (!verification.verified && !allowMockVerification) {
      payment.status = "failed";
      payment.events.push({ eventType: "verification_failed", message: verification.reason });
      await payment.save();
      return res.status(400).json({ success: false, message: verification.reason, payment: toResponse(payment) });
    }

    payment.status = "paid";
    payment.provider = "razorpay";
    payment.paymentMode = "online";
    payment.providerPaymentId = paymentId;
    payment.providerOrderId = orderId;
    payment.providerSignature = signature;
    payment.transactionRef = paymentId;
    payment.paidAt = new Date();
    payment.events.push({ eventType: "payment_verified", message: verification.verified ? "Razorpay signature verified" : "Local mock payment marked paid" });
    await payment.save();

    res.json({ success: true, message: "Payment verified/paid ho gaya", payment: toResponse(payment) });
  } catch (error) {
    next(error);
  }
}

export async function getReceipt(req, res, next) {
  try {
    const payment = await PaymentRecord.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!payment) return res.status(404).json({ success: false, message: "Payment record nahi mila" });

    res.json({
      success: true,
      receipt: {
        receiptNumber: payment.receiptNumber,
        instituteName: payment.instituteName || req.user.instituteName || "NAXORA Institute",
        title: payment.title,
        payerName: payment.payerName,
        studentName: payment.studentName,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        provider: payment.provider,
        paymentMode: payment.paymentMode,
        providerOrderId: payment.providerOrderId,
        providerPaymentId: payment.providerPaymentId,
        transactionRef: payment.transactionRef,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        note: payment.receiptNote,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function webhookReceiver(req, res, next) {
  try {
    const webhookCheck = verifyWebhookSignature(req);
    if (!webhookCheck.verified) return res.status(400).json({ success: false, message: webhookCheck.reason });

    const eventName = clean(req.body.event || "payment.webhook.received");
    const entity = req.body?.payload?.payment?.entity || {};
    const orderId = clean(entity.order_id || req.body.providerOrderId || "");
    const paymentId = clean(entity.id || req.body.providerPaymentId || "");
    const amount = Number(entity.amount || 0) / 100;

    if (orderId || paymentId) {
      const payment = await PaymentRecord.findOne({
        $or: [{ providerOrderId: orderId }, { providerPaymentId: paymentId }],
      });
      if (payment) {
        payment.provider = "razorpay";
        payment.providerOrderId = orderId || payment.providerOrderId;
        payment.providerPaymentId = paymentId || payment.providerPaymentId;
        payment.transactionRef = paymentId || payment.transactionRef;
        payment.events.push({ eventType: "webhook", message: `${eventName}${webhookCheck.enabled ? " • signed" : ""}` });
        if (eventName.includes("captured") || eventName.includes("paid") || entity.status === "captured") {
          payment.status = "paid";
          payment.paidAt = payment.paidAt || new Date();
          if (amount) payment.amount = payment.amount || amount;
        }
        if (eventName.includes("failed") || entity.status === "failed") payment.status = "failed";
        await payment.save();
      }
    }

    res.json({ success: true, message: "Webhook received", event: eventName });
  } catch (error) {
    next(error);
  }
}

export async function deletePayment(req, res, next) {
  try {
    const payment = await PaymentRecord.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!payment) return res.status(404).json({ success: false, message: "Payment record nahi mila" });
    res.json({ success: true, message: "Payment record delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
