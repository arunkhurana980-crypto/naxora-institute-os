export function getEnvHealth() {
  const checks = [
    { key: "PORT", ok: Boolean(process.env.PORT), safeValue: process.env.PORT || "5000 fallback" },
    { key: "NODE_ENV", ok: Boolean(process.env.NODE_ENV), safeValue: process.env.NODE_ENV || "development fallback" },
    { key: "FRONTEND_URL", ok: Boolean(process.env.FRONTEND_URL), safeValue: process.env.FRONTEND_URL || "not set" },
    { key: "MONGODB_URI", ok: Boolean(process.env.MONGODB_URI?.startsWith("mongodb")), safeValue: process.env.MONGODB_URI ? "configured" : "missing" },
    { key: "JWT_SECRET", ok: Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 24), safeValue: process.env.JWT_SECRET ? "configured" : "missing" },
    { key: "JWT_EXPIRES_IN", ok: Boolean(process.env.JWT_EXPIRES_IN), safeValue: process.env.JWT_EXPIRES_IN || "7d fallback" },
    { key: "RAZORPAY_KEY_ID", ok: Boolean(process.env.RAZORPAY_KEY_ID), safeValue: process.env.RAZORPAY_KEY_ID ? "configured" : "optional / mock mode" },
    { key: "RAZORPAY_KEY_SECRET", ok: Boolean(process.env.RAZORPAY_KEY_SECRET), safeValue: process.env.RAZORPAY_KEY_SECRET ? "configured" : "optional / mock mode" },
  ];

  const requiredKeys = checks.filter((item) => ["MONGODB_URI", "JWT_SECRET"].includes(item.key));
  return {
    healthy: requiredKeys.every((item) => item.ok),
    checks,
    warnings: checks.filter((item) => !item.ok).map((item) => `${item.key}: ${item.safeValue}`),
  };
}
