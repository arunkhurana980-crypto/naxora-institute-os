import "dotenv/config";

const requiredForProduction = ["JWT_SECRET", "MONGODB_URI"];
const recommended = ["FRONTEND_URL", "CORS_ORIGINS", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"];
const urlLike = (value = "") => /^https?:\/\//.test(value);

const report = {
  nodeVersion: process.version,
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || "5000(default)",
  checks: [],
  warnings: [],
  nextSteps: []
};

for (const key of requiredForProduction) {
  report.checks.push({ key, present: Boolean(process.env[key]), required: true });
  if (!process.env[key]) report.warnings.push(`${key} missing hai. Production me set karna zaroori hai.`);
}
for (const key of recommended) {
  report.checks.push({ key, present: Boolean(process.env[key]), required: false });
}

if (process.env.FRONTEND_URL && !urlLike(process.env.FRONTEND_URL)) {
  report.warnings.push("FRONTEND_URL valid http/https URL jaisa nahi lag raha.");
}
if ((process.env.JWT_SECRET || "").length < 32) {
  report.warnings.push("JWT_SECRET 32+ characters ka strong random string rakho.");
}
if ((process.env.MONGODB_URI || "").includes("YOUR_") || (process.env.MONGODB_URI || "").includes("PASSWORD")) {
  report.warnings.push("MONGODB_URI placeholder lag raha hai. Real Atlas URI paste karo.");
}

report.nextSteps = [
  "Render/Railway par rootDir backend set karo.",
  "Build command: npm install",
  "Start command: npm start",
  "MongoDB Atlas Network Access me deploy platform IP/0.0.0.0/0 allow karo.",
  "Live URL milne ke baad CORS_ORIGINS me frontend/live domain add karo.",
  "Browser me /api/deployment/status aur /app check karo."
];

console.log(JSON.stringify(report, null, 2));
if (report.warnings.length) {
  console.warn("\n⚠️ Deployment warnings found. Development continue ho sakta hai, production se pehle fix karo.");
} else {
  console.log("\n✅ Deployment env looks ready.");
}
