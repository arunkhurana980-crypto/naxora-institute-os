const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 300;
const requestBucket = new Map();

function clientKey(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "local";
}

export function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-NAXORA-Security", "Part-29-Active");
  next();
}

export function basicRateLimit(req, res, next) {
  const key = clientKey(req);
  const now = Date.now();
  const record = requestBucket.get(key) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + WINDOW_MS;
  }

  record.count += 1;
  requestBucket.set(key, record);

  res.setHeader("X-RateLimit-Limit", String(MAX_REQUESTS_PER_WINDOW));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(MAX_REQUESTS_PER_WINDOW - record.count, 0)));

  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      success: false,
      code: "RATE_LIMITED",
      message: "Bahut zyada requests aa rahi hain. 15 minute baad dobara try karo.",
    });
  }

  next();
}

function cleanValue(value) {
  if (typeof value === "string") {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .trim();
  }
  if (Array.isArray(value)) return value.map(cleanValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, cleanValue(val)]));
  }
  return value;
}

export function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = cleanValue(req.body);
  }
  next();
}

export function validateObjectIdParam(paramName = "id") {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!value) return next();
    if (!/^[0-9a-fA-F]{24}$/.test(value)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_ID",
        message: "Invalid record ID. Please valid MongoDB ID bhejo.",
      });
    }
    next();
  };
}

export function validateRequired(fields = []) {
  return (req, res, next) => {
    const missing = fields.filter((field) => {
      const value = req.body?.[field];
      return value === undefined || value === null || String(value).trim() === "";
    });

    if (missing.length) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: `${missing.join(", ")} required hai`,
        fields: missing,
      });
    }

    next();
  };
}

export function validateEmail(req, res, next) {
  const email = req.body?.email;
  if (!email) return next();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(email).toLowerCase())) {
    return res.status(400).json({
      success: false,
      code: "INVALID_EMAIL",
      message: "Valid email address likho.",
    });
  }
  req.body.email = String(email).toLowerCase().trim();
  next();
}

export function validatePassword(req, res, next) {
  const password = req.body?.password;
  if (!password) return next();
  if (String(password).length < 8) {
    return res.status(400).json({
      success: false,
      code: "WEAK_PASSWORD",
      message: "Password minimum 8 characters ka hona chahiye.",
    });
  }
  next();
}
