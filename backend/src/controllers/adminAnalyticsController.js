import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import Fee from "../models/Fee.js";
import AdmissionEnquiry from "../models/AdmissionEnquiry.js";
import Subscription from "../models/Subscription.js";
import DiscoveryLead from "../models/DiscoveryLead.js";
import LiveClass from "../models/LiveClass.js";
import OnlineBatchAccess from "../models/OnlineBatchAccess.js";

const money = (value) => Number(value || 0);

const mockAnalytics = () => ({
  success: true,
  mode: "mock",
  part: "Part 43 - Admin Analytics Charts + Growth Dashboard",
  generatedAt: new Date().toISOString(),
  kpis: [
    { label: "Monthly Revenue", value: "₹2.48L", trend: "+18%", tone: "up", note: "Fees + SaaS + live class add-ons" },
    { label: "New Leads", value: "186", trend: "+34%", tone: "up", note: "Discovery + admission enquiries" },
    { label: "Active Students", value: "1,248", trend: "+11%", tone: "up", note: "Across offline + online batches" },
    { label: "Conversion Rate", value: "27%", trend: "+6%", tone: "up", note: "Lead to admission conversion" },
    { label: "Live Class Usage", value: "72%", trend: "+21%", tone: "up", note: "Batch access gated sessions" },
    { label: "Pending Fees", value: "₹43K", trend: "-9%", tone: "down", note: "Collection improved this week" }
  ],
  revenueSeries: [
    { month: "Jan", revenue: 62000, fees: 42000, subscriptions: 12000, liveClasses: 8000 },
    { month: "Feb", revenue: 78000, fees: 53000, subscriptions: 15000, liveClasses: 10000 },
    { month: "Mar", revenue: 92000, fees: 65000, subscriptions: 16000, liveClasses: 11000 },
    { month: "Apr", revenue: 125000, fees: 87000, subscriptions: 23000, liveClasses: 15000 },
    { month: "May", revenue: 168000, fees: 112000, subscriptions: 35000, liveClasses: 21000 },
    { month: "Jun", revenue: 248000, fees: 162000, subscriptions: 52000, liveClasses: 34000 }
  ],
  leadFunnel: [
    { stage: "Visited", count: 780 },
    { stage: "Enquired", count: 310 },
    { stage: "Demo Booked", count: 142 },
    { stage: "Follow-up", count: 96 },
    { stage: "Converted", count: 54 }
  ],
  studentGrowth: [
    { label: "Week 1", students: 930 },
    { label: "Week 2", students: 1010 },
    { label: "Week 3", students: 1135 },
    { label: "Week 4", students: 1248 }
  ],
  planBreakdown: [
    { plan: "Starter", count: 18 },
    { plan: "Pro", count: 27 },
    { plan: "Premium", count: 14 },
    { plan: "Enterprise", count: 4 }
  ],
  liveClassStats: [
    { label: "Scheduled", count: 44 },
    { label: "Live", count: 6 },
    { label: "Completed", count: 132 },
    { label: "Recordings", count: 88 }
  ],
  discoveryStats: [
    { label: "Searches", count: 1280 },
    { label: "Profile Views", count: 740 },
    { label: "Leads", count: 186 },
    { label: "Converted", count: 39 }
  ],
  alerts: [
    "12 hot leads need follow-up today",
    "8 online batch students have payment due this week",
    "Live Classes add-on is growing faster than base SaaS plan",
    "Discovery marketplace leads conversion should be tracked daily"
  ]
});

async function safeCount(Model, filter = {}) {
  try {
    if (globalThis.NAXORA_DB_MODE === "mock") return 0;
    return await Model.countDocuments(filter);
  } catch {
    return 0;
  }
}

async function safeSum(Model, field, filter = {}) {
  try {
    if (globalThis.NAXORA_DB_MODE === "mock") return 0;
    const result = await Model.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: `$${field}` } } }
    ]);
    return money(result?.[0]?.total);
  } catch {
    return 0;
  }
}

export const getAdminAnalyticsStatus = (req, res) => {
  res.json({
    success: true,
    part: "Part 43 - Admin Analytics Charts + Growth Dashboard",
    route: "/api/admin-analytics",
    charts: [
      "Revenue trend",
      "Leads funnel",
      "Student growth",
      "SaaS plan breakdown",
      "Live classes usage",
      "Discovery marketplace analytics"
    ],
    frontendFiles: ["frontend/admin-analytics.html", "frontend/admin-analytics.css", "frontend/admin-analytics.js"],
    note: "Ye Part 42 integrated full build ke upar merged hai, standalone chhota project nahi."
  });
};

export const getAdminAnalytics = async (req, res) => {
  const base = mockAnalytics();

  if (globalThis.NAXORA_DB_MODE === "mock") {
    return res.json(base);
  }

  const [
    students,
    teachers,
    paidFees,
    pendingFees,
    enquiries,
    convertedEnquiries,
    subscriptions,
    discoveryLeads,
    liveClasses,
    onlineBatches
  ] = await Promise.all([
    safeCount(Student),
    safeCount(Teacher),
    safeSum(Fee, "paidAmount", { status: { $in: ["paid", "partial"] } }),
    safeSum(Fee, "pendingAmount", { status: { $in: ["pending", "partial", "overdue"] } }),
    safeCount(AdmissionEnquiry),
    safeCount(AdmissionEnquiry, { status: /converted/i }),
    safeCount(Subscription),
    safeCount(DiscoveryLead),
    safeCount(LiveClass),
    safeCount(OnlineBatchAccess)
  ]);

  const conversionRate = enquiries ? Math.round((convertedEnquiries / enquiries) * 100) : 0;

  const response = {
    ...base,
    mode: "database",
    kpis: [
      { label: "Students", value: String(students), trend: "+live", tone: "up", note: "MongoDB students collection" },
      { label: "Teachers", value: String(teachers), trend: "+live", tone: "up", note: "MongoDB teachers collection" },
      { label: "Fees Collected", value: `₹${paidFees.toLocaleString("en-IN")}`, trend: "+live", tone: "up", note: "Paid + partial records" },
      { label: "Pending Fees", value: `₹${pendingFees.toLocaleString("en-IN")}`, trend: "watch", tone: "warn", note: "Pending + overdue records" },
      { label: "Lead Conversion", value: `${conversionRate}%`, trend: "+live", tone: "up", note: `${convertedEnquiries}/${enquiries} converted` },
      { label: "SaaS Institutes", value: String(subscriptions), trend: "+live", tone: "up", note: "Subscription records" }
    ],
    discoveryStats: [
      { label: "Discovery Leads", count: discoveryLeads },
      { label: "Admission Leads", count: enquiries },
      { label: "Converted", count: convertedEnquiries },
      { label: "Conversion %", count: conversionRate }
    ],
    liveClassStats: [
      { label: "Live Classes", count: liveClasses },
      { label: "Online Batches", count: onlineBatches },
      { label: "Batch Access Rule", count: 1 },
      { label: "Subscription Gate", count: 1 }
    ]
  };

  res.json(response);
};
