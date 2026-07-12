import mongoose from "mongoose";
import DemoRequest from "../models/DemoRequest.js";

const mockRequests = [];

const plans = [
  {
    name: "Starter",
    priceMonthly: 499,
    target: "Small coaching",
    features: ["Students", "Fees", "Attendance", "Basic reports"],
    cta: "Start Demo",
  },
  {
    name: "Pro",
    priceMonthly: 999,
    target: "Growing institute",
    features: ["CRM", "Parents", "AI Doubts", "Tests", "Timetable"],
    cta: "Book Demo",
    popular: true,
  },
  {
    name: "Premium",
    priceMonthly: 1999,
    target: "Serious institute",
    features: ["AI Notes", "AI Mock Tests", "Leads Marketplace", "Payments", "Super Admin"],
    cta: "Upgrade Demo",
  },
  {
    name: "Live Classes Add-on",
    priceMonthly: 1999,
    target: "Online batches",
    features: ["Live class scheduling", "Comments", "Recordings", "Batch access gating"],
    cta: "Add Live Classes",
  },
  {
    name: "VANI AI Add-on",
    priceMonthly: 1499,
    target: "Voice automation",
    features: ["Voice search", "Voice reports", "Lead help", "Owner assistant"],
    cta: "Enable VANI",
  },
];

export function landingStatus(req, res) {
  res.json({
    success: true,
    part: "Part 41 - Premium SaaS Landing Page",
    routes: [
      "/api/landing/status",
      "/api/landing/plans",
      "/api/landing/demo-request",
      "/landing",
      "/app",
    ],
    message: "NAXORA premium SaaS landing page is active.",
  });
}

export function getPlans(req, res) {
  res.json({ success: true, count: plans.length, plans });
}

export async function createDemoRequest(req, res) {
  const { instituteName, ownerName, phone, city } = req.body || {};
  if (!instituteName || !ownerName || !phone || !city) {
    return res.status(400).json({
      success: false,
      message: "Institute name, owner name, phone and city are required.",
    });
  }

  const payload = {
    instituteName,
    ownerName,
    phone,
    city,
    instituteType: req.body.instituteType || "Coaching Institute",
    interestedPlan: req.body.interestedPlan || "Premium",
    message: req.body.message || "",
  };

  try {
    if (mongoose.connection.readyState === 1) {
      const saved = await DemoRequest.create(payload);
      return res.status(201).json({ success: true, mode: "mongodb", request: saved });
    }
  } catch (error) {
    console.log("Demo request Mongo save failed, falling back to mock:", error.message);
  }

  const mock = { _id: `mock_${Date.now()}`, ...payload, status: "New", createdAt: new Date().toISOString() };
  mockRequests.unshift(mock);
  res.status(201).json({ success: true, mode: "mock", request: mock });
}

export async function getDemoRequests(req, res) {
  try {
    if (mongoose.connection.readyState === 1) {
      const requests = await DemoRequest.find().sort({ createdAt: -1 }).limit(50);
      return res.json({ success: true, mode: "mongodb", count: requests.length, requests });
    }
  } catch (error) {
    console.log("Demo request fetch failed, falling back to mock:", error.message);
  }
  res.json({ success: true, mode: "mock", count: mockRequests.length, requests: mockRequests });
}
