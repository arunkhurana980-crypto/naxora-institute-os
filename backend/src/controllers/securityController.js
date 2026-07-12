import mongoose from "mongoose";
import { getEnvHealth } from "../utils/envCheck.js";

export async function getSecurityStatus(req, res) {
  const env = getEnvHealth();
  const dbState = mongoose.connection.readyState;
  const dbLabels = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.json({
    success: true,
    part: "Part 29 - Security, Validation & Error Fixing",
    security: {
      headers: "active",
      rateLimit: "active",
      bodySanitizer: "active",
      authValidation: "active",
      routeNotFoundHelper: "active",
      safeErrorHandler: process.env.NODE_ENV === "production" ? "production-safe" : "development-details",
    },
    database: {
      status: dbLabels[dbState] || "unknown",
      connected: dbState === 1,
    },
    environment: env,
    quickFixes: [
      "Route not found aaye to pehle /api/health check karo.",
      "Failed to fetch aaye to backend running, CORS, frontend port aur token check karo.",
      "MongoDB crash aaye to MONGODB_URI, password aur Network Access/IP allowlist check karo.",
      "Token invalid aaye to logout karke localStorage clear karo aur login dobara karo.",
    ],
  });
}

export function runFrontendDebug(req, res) {
  res.json({
    success: true,
    message: "Frontend debug helper ready hai",
    expectedApiBase: "http://127.0.0.1:5000/api",
    expectedLiveServerPorts: ["5500", "5501", "5502", "5503"],
    checks: [
      "frontend JS me const API = http://127.0.0.1:5000/api hona chahiye",
      "backend terminal me PART 29 ROUTES ACTIVE line aani chahiye",
      "browser me /api/health open hona chahiye",
      "login ke baad localStorage me naxora_token hona chahiye",
    ],
  });
}
