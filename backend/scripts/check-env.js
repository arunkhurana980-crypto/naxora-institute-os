import "dotenv/config";

const required = ["PORT", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);

console.log("NAXORA ENV CHECK");
console.log("PORT:", process.env.PORT || "5000 default");
console.log("FRONTEND_URL:", process.env.FRONTEND_URL || "not set, common localhost ports allowed");
console.log("MONGODB_URI:", process.env.MONGODB_URI ? "present" : "missing -> mock mode allowed");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "present" : "missing");
console.log("RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID ? "present" : "missing -> mock mode");

if (missing.length) {
  console.warn("Missing important env:", missing.join(", "));
  console.warn("Dev server can still run, but auth may need JWT_SECRET in .env.");
} else {
  console.log("✅ Basic env looks okay.");
}
