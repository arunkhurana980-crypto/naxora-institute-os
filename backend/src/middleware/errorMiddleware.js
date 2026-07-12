function isDuplicateKeyError(err) {
  return err && err.code === 11000;
}

function isValidationError(err) {
  return err?.name === "ValidationError";
}

function isCastError(err) {
  return err?.name === "CastError";
}

export function notFound(req, res) {
  res.status(404).json({
    success: false,
    code: "ROUTE_NOT_FOUND",
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    hint: "Backend route active nahi hai. Correct part ka backend run karo aur /api/health check karo.",
  });
}

export function errorHandler(err, req, res, next) {
  console.error("❌ NAXORA ERROR:", err);

  if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyValue || {})[0] || "record";
    return res.status(409).json({
      success: false,
      code: "DUPLICATE_RECORD",
      message: `${field} already exists. Duplicate entry allowed nahi hai.`,
      field,
    });
  }

  if (isValidationError(err)) {
    const fields = Object.values(err.errors || {}).map((item) => ({ field: item.path, message: item.message }));
    return res.status(400).json({
      success: false,
      code: "MONGOOSE_VALIDATION_ERROR",
      message: "Form data valid nahi hai. Required fields check karo.",
      fields,
    });
  }

  if (isCastError(err)) {
    return res.status(400).json({
      success: false,
      code: "INVALID_ID",
      message: "Invalid record ID. Correct database ID bhejo.",
    });
  }

  const status = res.statusCode >= 400 ? res.statusCode : 500;
  res.status(status).json({
    success: false,
    code: err.code || "SERVER_ERROR",
    message: process.env.NODE_ENV === "production" ? "Server error. Please try again." : err.message,
    hint: process.env.NODE_ENV === "production" ? undefined : "Terminal me red error ki 5-6 lines check karo.",
  });
}
