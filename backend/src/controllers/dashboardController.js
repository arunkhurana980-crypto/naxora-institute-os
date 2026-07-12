import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
import Attendance from "../models/Attendance.js";
import Fee from "../models/Fee.js";
import Doubt from "../models/Doubt.js";
import Assignment from "../models/Assignment.js";
import TestResult from "../models/TestResult.js";
import Announcement from "../models/Announcement.js";
import Certificate from "../models/Certificate.js";
import LibraryItem from "../models/LibraryItem.js";
import FinanceRecord from "../models/FinanceRecord.js";
import Staff from "../models/Staff.js";
import Parent from "../models/Parent.js";
import Progress from "../models/Progress.js";
import QuestionPaper from "../models/QuestionPaper.js";
import QuestionBankItem from "../models/QuestionBankItem.js";
import TimetableSlot from "../models/TimetableSlot.js";
import AdmissionEnquiry from "../models/AdmissionEnquiry.js";
import Subscription from "../models/Subscription.js";
import PaymentRecord from "../models/PaymentRecord.js";
import AiNote from "../models/AiNote.js";
import NotificationCampaign from "../models/NotificationCampaign.js";
import LiveClass from "../models/LiveClass.js";
import LiveClassSubscription from "../models/LiveClassSubscription.js";

const roleCards = {
  admin: [
    { title: "Students", type: "students", icon: "🎓" },
    { title: "Teachers", type: "teachers", icon: "👩‍🏫" },
    { title: "Staff", type: "staff", icon: "🧑‍💼" },
    { title: "Parents", type: "parents", icon: "👪" },
    { title: "Progress", type: "progress", icon: "📈" },
    { title: "Courses", type: "courses", icon: "📚" },
    { title: "Batches", type: "batches", icon: "🏫" },
    { title: "Attendance", type: "attendance", icon: "✅" },
    { title: "Fees", type: "fees", icon: "💳" },
    { title: "Payments", type: "payments", icon: "🧾" },
    { title: "Staff", type: "staff", icon: "🧑‍💼" },
    { title: "AI Doubts", type: "doubts", icon: "🤖" },
    { title: "AI Notes", type: "aiNotes", icon: "🧠" },
    { title: "Live Classes", type: "liveClasses", icon: "🎥" },
    { title: "WhatsApp/SMS", type: "notifications", icon: "📲" },
    { title: "Assignments", type: "assignments", icon: "📝" },
    { title: "Tests", type: "tests", icon: "🏆" },
    { title: "Test Builder", type: "testBuilder", icon: "🧪" },
    { title: "Question Bank", type: "questionBank", icon: "🏦" },
    { title: "Timetable", type: "timetable", icon: "🗓️" },
    { title: "Enquiries", type: "enquiries", icon: "📞" },
    { title: "Follow-ups", type: "followups", icon: "⏰" },
    { title: "Subscriptions", type: "subscriptions", icon: "💎" },
    { title: "Super Admin", type: "superAdmin", icon: "🛡️" },
    { title: "Announcements", type: "announcements", icon: "🔔" },
    { title: "Certificates", type: "certificates", icon: "🎖️" },
    { title: "Library", type: "library", icon: "📖" },
    { title: "Finance", type: "finance", icon: "💼" },
  ],
  teacher: [
    { title: "My Batches", type: "batches", icon: "🏫" },
    { title: "Courses", type: "courses", icon: "📚" },
    { title: "Students", type: "students", icon: "🎓" },
    { title: "Staff", type: "staff", icon: "🧑‍💼" },
    { title: "Parents", type: "parents", icon: "👪" },
    { title: "Progress", type: "progress", icon: "📈" },
    { title: "Attendance", type: "attendance", icon: "✅" },
    { title: "Fees", type: "fees", icon: "💳" },
    { title: "Payments", type: "payments", icon: "🧾" },
    { title: "Staff", type: "staff", icon: "🧑‍💼" },
    { title: "AI Doubts", type: "doubts", icon: "🤖" },
    { title: "AI Notes", type: "aiNotes", icon: "🧠" },
    { title: "Live Classes", type: "liveClasses", icon: "🎥" },
    { title: "WhatsApp/SMS", type: "notifications", icon: "📲" },
    { title: "Assignments", type: "assignments", icon: "📝" },
    { title: "Tests", type: "tests", icon: "🏆" },
    { title: "Test Builder", type: "testBuilder", icon: "🧪" },
    { title: "Question Bank", type: "questionBank", icon: "🏦" },
    { title: "Timetable", type: "timetable", icon: "🗓️" },
    { title: "Enquiries", type: "enquiries", icon: "📞" },
    { title: "Follow-ups", type: "followups", icon: "⏰" },
    { title: "Subscriptions", type: "subscriptions", icon: "💎" },
    { title: "Super Admin", type: "superAdmin", icon: "🛡️" },
    { title: "Announcements", type: "announcements", icon: "🔔" },
    { title: "Certificates", type: "certificates", icon: "🎖️" },
    { title: "Library", type: "library", icon: "📖" },
    { title: "Finance", type: "finance", icon: "💼" },
  ],
  student: [
    { title: "Courses", type: "courses", icon: "📚" },
    { title: "Batches", type: "batches", icon: "🏫" },
    { title: "Attendance", type: "attendance", icon: "✅" },
    { title: "Fees", type: "fees", icon: "💳" },
    { title: "Payments", type: "payments", icon: "🧾" },
    { title: "Staff", type: "staff", icon: "🧑‍💼" },
    { title: "AI Doubts", type: "doubts", icon: "🤖" },
    { title: "AI Notes", type: "aiNotes", icon: "🧠" },
    { title: "Live Classes", type: "liveClasses", icon: "🎥" },
    { title: "WhatsApp/SMS", type: "notifications", icon: "📲" },
    { title: "Assignments", type: "assignments", icon: "📝" },
    { title: "Tests", type: "tests", icon: "🏆" },
    { title: "Test Builder", type: "testBuilder", icon: "🧪" },
    { title: "Question Bank", type: "questionBank", icon: "🏦" },
    { title: "Timetable", type: "timetable", icon: "🗓️" },
    { title: "Enquiries", type: "enquiries", icon: "📞" },
    { title: "Follow-ups", type: "followups", icon: "⏰" },
    { title: "Subscriptions", type: "subscriptions", icon: "💎" },
    { title: "Super Admin", type: "superAdmin", icon: "🛡️" },
    { title: "Progress", type: "progress", icon: "📈" },
    { title: "Announcements", type: "announcements", icon: "🔔" },
    { title: "Certificates", type: "certificates", icon: "🎖️" },
    { title: "Library", type: "library", icon: "📖" },
    { title: "Finance", type: "finance", icon: "💼" },
  ],
  parent: [
    { title: "Parent Portal", type: "parents", icon: "👪" },
    { title: "Attendance", type: "attendance", icon: "✅" },
    { title: "Fees", type: "fees", icon: "💳" },
    { title: "Payments", type: "payments", icon: "🧾" },
    { title: "Batches", type: "batches", icon: "🏫" },
    { title: "AI Doubts", type: "doubts", icon: "🤖" },
    { title: "AI Notes", type: "aiNotes", icon: "🧠" },
    { title: "Live Classes", type: "liveClasses", icon: "🎥" },
    { title: "WhatsApp/SMS", type: "notifications", icon: "📲" },
    { title: "Assignments", type: "assignments", icon: "📝" },
    { title: "Tests", type: "tests", icon: "🏆" },
    { title: "Test Builder", type: "testBuilder", icon: "🧪" },
    { title: "Question Bank", type: "questionBank", icon: "🏦" },
    { title: "Timetable", type: "timetable", icon: "🗓️" },
    { title: "Enquiries", type: "enquiries", icon: "📞" },
    { title: "Follow-ups", type: "followups", icon: "⏰" },
    { title: "Subscriptions", type: "subscriptions", icon: "💎" },
    { title: "Super Admin", type: "superAdmin", icon: "🛡️" },
    { title: "Announcements", type: "announcements", icon: "🔔" },
    { title: "Certificates", type: "certificates", icon: "🎖️" },
    { title: "Library", type: "library", icon: "📖" },
    { title: "Finance", type: "finance", icon: "💼" },
  ],
};

const roadmapModules = [
  { name: "Student Management", status: "Active", icon: "🎓" },
  { name: "Teacher Management", status: "Active", icon: "👩‍🏫" },
  { name: "Batch & Course System", status: "Active now", icon: "🏫" },
  { name: "Attendance System", status: "Active now", icon: "✅" },
  { name: "Fees & Payments", status: "Active now", icon: "💳" },
  { name: "Fee Receipts", status: "Part 7", icon: "🧾" },
  { name: "AI Doubt Solver", status: "Active now", icon: "🤖" },
  { name: "AI Notes Generator", status: "Part 31 active", icon: "🧠" },
  { name: "Live Classes + Comments", status: "Part 39 active", icon: "🎥" },
  { name: "WhatsApp/SMS Notifications", status: "Part 34 active", icon: "📲" },
  { name: "Assignments & Homework", status: "Active now", icon: "📝" },
  { name: "Tests & Results", status: "Active now", icon: "🏆" },
  { name: "Notifications & Announcements", status: "Active now", icon: "🔔" },
  { name: "Certificates & ID Cards", status: "Active now", icon: "🎖️" },
  { name: "Library & Study Material", status: "Active now", icon: "📖" },
  { name: "Expense & Income Management", status: "Active now", icon: "💼" },
  { name: "Staff Management", status: "Active now", icon: "🧑‍💼" },
  { name: "Parent Portal", status: "Active now", icon: "👪" },
  { name: "Student Progress Tracking", status: "Active now", icon: "📈" },
  { name: "Online Test Builder", status: "Active now", icon: "🧪" },
  { name: "Question Bank System", status: "Active now", icon: "🏦" },
  { name: "Timetable Management", status: "Active now", icon: "🗓️" },
  { name: "Admission Enquiry CRM", status: "Active now", icon: "📞" },
  { name: "Lead Follow-up Automation", status: "Active now", icon: "⏰" },
  { name: "SaaS Subscription Plans", status: "Active now", icon: "💎" },
  { name: "Super Admin Panel", status: "Active now", icon: "🛡️" },
  { name: "Payment Integration Structure", status: "Active now", icon: "🧾" },
];

export async function getDashboard(req, res, next) {
  try {
    const role = req.user.role;
    const ownerFilter = { createdBy: req.user._id };

    const [totalProgressReports, excellentProgressReports, needsAttentionProgressReports, sharedProgressReports, avgProgressAgg] = await Promise.all([
      Progress.countDocuments(ownerFilter),
      Progress.countDocuments({ ...ownerFilter, overallStatus: "excellent" }),
      Progress.countDocuments({ ...ownerFilter, overallStatus: { $in: ["needs_attention", "critical"] } }),
      Progress.countDocuments({ ...ownerFilter, reportStatus: { $in: ["shared", "reviewed"] } }),
      Progress.aggregate([{ $match: ownerFilter }, { $group: { _id: null, avg: { $avg: "$overallScore" } } }]),
    ]);

    const [
      totalStudents,
      activeStudents,
      pendingFees,
      totalTeachers,
      activeTeachers,
      pendingSalary,
      totalStaff,
      activeStaff,
      staffOnLeave,
      pendingStaffSalary,
      staffSalaryAgg,
      totalParents,
      activeParents,
      followupParents,
      portalEnabledParents,
      parentChildAgg,
      parentFeePending,
      totalCourses,
      activeCourses,
      upcomingCourses,
      totalBatches,
      activeBatches,
      upcomingBatches,
      totalAttendanceSessions,
      totalMarkedStudents,
      presentAttendance,
      lateAttendance,
      totalFeeRecords,
      paidFeeAgg,
      pendingFeeAgg,
      overdueFeeRecords,
      totalDoubts,
      solvedDoubts,
      reviewDoubts,
      totalAssignments,
      activeAssignments,
      pendingAssignments,
      checkedAssignments,
      totalTests,
      scheduledTests,
      completedTests,
      publishedTests,
      resultRowsAgg,
      passRowsAgg,
      totalAnnouncements,
      publishedAnnouncements,
      urgentAnnouncements,
      totalCertificates,
      issuedCertificates,
      totalIdCards,
      revokedDocuments,
      totalLibraryItems,
      activeLibraryItems,
      digitalLibraryItems,
      issuedLibraryAgg,
      overdueLibraryAgg,
      totalFinanceRecords,
      totalIncomeAgg,
      totalExpenseAgg,
      pendingFinanceAgg,
    ] = await Promise.all([
      Student.countDocuments(ownerFilter),
      Student.countDocuments({ ...ownerFilter, status: "active" }),
      Student.countDocuments({ ...ownerFilter, feesStatus: "pending" }),
      Teacher.countDocuments(ownerFilter),
      Teacher.countDocuments({ ...ownerFilter, status: "active" }),
      Teacher.countDocuments({ ...ownerFilter, salaryStatus: "pending" }),
      Staff.countDocuments(ownerFilter),
      Staff.countDocuments({ ...ownerFilter, status: "active" }),
      Staff.countDocuments({ ...ownerFilter, status: "on_leave" }),
      Staff.countDocuments({ ...ownerFilter, salaryStatus: { $in: ["pending", "partial"] } }),
      Staff.aggregate([
        { $match: ownerFilter },
        { $group: { _id: null, total: { $sum: "$salaryAmount" } } },
      ]),
      Parent.countDocuments(ownerFilter),
      Parent.countDocuments({ ...ownerFilter, status: "active" }),
      Parent.countDocuments({ ...ownerFilter, status: "needs_followup" }),
      Parent.countDocuments({ ...ownerFilter, portalAccess: "enabled" }),
      Parent.aggregate([
        { $match: ownerFilter },
        { $project: { count: { $size: { $ifNull: ["$children", []] } } } },
        { $group: { _id: null, total: { $sum: "$count" } } },
      ]),
      Parent.countDocuments({ ...ownerFilter, "children.feeStatus": { $in: ["pending", "partial", "overdue"] } }),
      Course.countDocuments(ownerFilter),
      Course.countDocuments({ ...ownerFilter, status: "active" }),
      Course.countDocuments({ ...ownerFilter, status: "upcoming" }),
      Batch.countDocuments(ownerFilter),
      Batch.countDocuments({ ...ownerFilter, status: "active" }),
      Batch.countDocuments({ ...ownerFilter, status: "upcoming" }),
      Attendance.countDocuments(ownerFilter),
      Attendance.aggregate([
        { $match: ownerFilter },
        { $group: { _id: null, total: { $sum: "$totalStudents" } } },
      ]),
      Attendance.aggregate([
        { $match: ownerFilter },
        { $group: { _id: null, total: { $sum: "$presentCount" } } },
      ]),
      Attendance.aggregate([
        { $match: ownerFilter },
        { $group: { _id: null, total: { $sum: "$lateCount" } } },
      ]),
      Fee.countDocuments(ownerFilter),
      Fee.aggregate([
        { $match: ownerFilter },
        { $group: { _id: null, total: { $sum: "$paidAmount" } } },
      ]),
      Fee.aggregate([
        { $match: ownerFilter },
        { $group: { _id: null, total: { $sum: "$pendingAmount" } } },
      ]),
      Fee.countDocuments({ ...ownerFilter, status: "overdue" }),
      Doubt.countDocuments(ownerFilter),
      Doubt.countDocuments({ ...ownerFilter, status: "solved" }),
      Doubt.countDocuments({ ...ownerFilter, status: "teacher-review" }),
      Assignment.countDocuments(ownerFilter),
      Assignment.countDocuments({ ...ownerFilter, status: "active" }),
      Assignment.countDocuments({ ...ownerFilter, submissionStatus: "pending" }),
      Assignment.countDocuments({ ...ownerFilter, submissionStatus: "checked" }),
      TestResult.countDocuments(ownerFilter),
      TestResult.countDocuments({ ...ownerFilter, status: "scheduled" }),
      TestResult.countDocuments({ ...ownerFilter, status: "completed" }),
      TestResult.countDocuments({ ...ownerFilter, status: "published" }),
      TestResult.aggregate([
        { $match: ownerFilter },
        { $project: { count: { $size: { $ifNull: ["$results", []] } } } },
        { $group: { _id: null, total: { $sum: "$count" } } },
      ]),
      TestResult.aggregate([
        { $match: ownerFilter },
        { $unwind: { path: "$results", preserveNullAndEmptyArrays: false } },
        { $match: { "results.resultStatus": "pass" } },
        { $group: { _id: null, total: { $sum: 1 } } },
      ]),
      Announcement.countDocuments(ownerFilter),
      Announcement.countDocuments({ ...ownerFilter, status: "published" }),
      Announcement.countDocuments({ ...ownerFilter, priority: "urgent", status: "published" }),
      Certificate.countDocuments(ownerFilter),
      Certificate.countDocuments({ ...ownerFilter, status: "issued" }),
      Certificate.countDocuments({ ...ownerFilter, documentType: "id-card" }),
      Certificate.countDocuments({ ...ownerFilter, status: "revoked" }),
      LibraryItem.countDocuments(ownerFilter),
      LibraryItem.countDocuments({ ...ownerFilter, status: "active" }),
      LibraryItem.countDocuments({ ...ownerFilter, format: { $in: ["digital", "both"] } }),
      LibraryItem.aggregate([
        { $match: ownerFilter },
        { $project: { count: { $size: { $filter: { input: { $ifNull: ["$issueRecords", []] }, as: "record", cond: { $eq: ["$$record.status", "issued"] } } } } } },
        { $group: { _id: null, total: { $sum: "$count" } } },
      ]),
      LibraryItem.aggregate([
        { $match: ownerFilter },
        { $project: { count: { $size: { $filter: { input: { $ifNull: ["$issueRecords", []] }, as: "record", cond: { $eq: ["$$record.status", "overdue"] } } } } } },
        { $group: { _id: null, total: { $sum: "$count" } } },
      ]),
      FinanceRecord.countDocuments(ownerFilter),
      FinanceRecord.aggregate([
        { $match: { ...ownerFilter, recordType: "income", status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      FinanceRecord.aggregate([
        { $match: { ...ownerFilter, recordType: "expense", status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      FinanceRecord.aggregate([
        { $match: { ...ownerFilter, status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const attendanceStudents = totalMarkedStudents[0]?.total || 0;
    const attendancePresent = presentAttendance[0]?.total || 0;
    const attendanceLate = lateAttendance[0]?.total || 0;
    const attendancePercent = attendanceStudents
      ? Math.round(((attendancePresent + attendanceLate) / attendanceStudents) * 100)
      : 0;

    const paidFees = paidFeeAgg[0]?.total || 0;
    const pendingFeesAmount = pendingFeeAgg[0]?.total || 0;
    const totalResultRows = resultRowsAgg[0]?.total || 0;
    const passResultRows = passRowsAgg[0]?.total || 0;
    const testPassPercent = totalResultRows ? Math.round((passResultRows / totalResultRows) * 100) : 0;
    const issuedLibraryItems = issuedLibraryAgg[0]?.total || 0;
    const overdueLibraryItems = overdueLibraryAgg[0]?.total || 0;
    const financeIncome = totalIncomeAgg[0]?.total || 0;
    const financeExpense = totalExpenseAgg[0]?.total || 0;
    const financePending = pendingFinanceAgg[0]?.total || 0;
    const netProfit = financeIncome - financeExpense;
    const staffSalaryLoad = staffSalaryAgg[0]?.total || 0;
    const totalParentChildren = parentChildAgg[0]?.total || 0;
    const avgProgressScore = Math.round(avgProgressAgg[0]?.avg || 0);

    const [totalQuestionPapers, draftQuestionPapers, publishedQuestionPapers, liveQuestionPapers, questionPaperQuestionsAgg] = await Promise.all([
      QuestionPaper.countDocuments(ownerFilter),
      QuestionPaper.countDocuments({ ...ownerFilter, status: "draft" }),
      QuestionPaper.countDocuments({ ...ownerFilter, status: "published" }),
      QuestionPaper.countDocuments({ ...ownerFilter, status: "live" }),
      QuestionPaper.aggregate([
        { $match: ownerFilter },
        { $project: { count: { $size: { $ifNull: ["$questions", []] } } } },
        { $group: { _id: null, total: { $sum: "$count" } } },
      ]),
    ]);
    const totalQuestionPaperQuestions = questionPaperQuestionsAgg[0]?.total || 0;

    const [totalQuestionBankItems, approvedQuestionBankItems, draftQuestionBankItems, hardQuestionBankItems, questionBankUsageAgg] = await Promise.all([
      QuestionBankItem.countDocuments(ownerFilter),
      QuestionBankItem.countDocuments({ ...ownerFilter, status: "approved" }),
      QuestionBankItem.countDocuments({ ...ownerFilter, status: "draft" }),
      QuestionBankItem.countDocuments({ ...ownerFilter, difficulty: "hard" }),
      QuestionBankItem.aggregate([{ $match: ownerFilter }, { $group: { _id: null, total: { $sum: "$usageCount" } } }]),
    ]);
    const totalQuestionBankUsage = questionBankUsageAgg[0]?.total || 0;

    const [totalTimetableSlots, activeTimetableSlots, draftTimetableSlots, onlineTimetableSlots, priorityTimetableSlots] = await Promise.all([
      TimetableSlot.countDocuments(ownerFilter),
      TimetableSlot.countDocuments({ ...ownerFilter, status: "active" }),
      TimetableSlot.countDocuments({ ...ownerFilter, status: "draft" }),
      TimetableSlot.countDocuments({ ...ownerFilter, classMode: "online" }),
      TimetableSlot.countDocuments({ ...ownerFilter, priority: { $in: ["high", "urgent"] } }),
    ]);

    const [totalEnquiries, hotEnquiries, followUpEnquiries, convertedEnquiries, dueEnquiries] = await Promise.all([
      AdmissionEnquiry.countDocuments(ownerFilter),
      AdmissionEnquiry.countDocuments({ ...ownerFilter, leadTemperature: "hot" }),
      AdmissionEnquiry.countDocuments({ ...ownerFilter, status: "follow_up" }),
      AdmissionEnquiry.countDocuments({ ...ownerFilter, status: "converted" }),
      AdmissionEnquiry.countDocuments({ ...ownerFilter, status: { $nin: ["converted", "rejected", "lost"] }, nextFollowUpDate: { $lte: new Date() } }),
    ]);

    const [totalPaymentRecords, paidPaymentAgg, pendingPaymentAgg, failedPaymentRecords] = await Promise.all([
      PaymentRecord.countDocuments(ownerFilter),
      PaymentRecord.aggregate([{ $match: { ...ownerFilter, status: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      PaymentRecord.aggregate([{ $match: { ...ownerFilter, status: { $in: ["created", "pending"] } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      PaymentRecord.countDocuments({ ...ownerFilter, status: "failed" }),
    ]);
    const paidPaymentAmount = paidPaymentAgg[0]?.total || 0;
    const pendingPaymentAmount = pendingPaymentAgg[0]?.total || 0;

    const totalAiNotes = await AiNote.countDocuments(ownerFilter);
    const [totalNotifications, sentNotifications, scheduledNotifications, failedNotifications] = await Promise.all([
      NotificationCampaign.countDocuments(ownerFilter),
      NotificationCampaign.countDocuments({ ...ownerFilter, status: "sent" }),
      NotificationCampaign.countDocuments({ ...ownerFilter, status: "scheduled" }),
      NotificationCampaign.countDocuments({ ...ownerFilter, status: "failed" }),
    ]);

    const stats = {
      students: { value: String(totalStudents), label: `${activeStudents} active • ${pendingFees} fees pending` },
      teachers: { value: String(totalTeachers), label: `${activeTeachers} active • ${pendingSalary} salary pending` },
      staff: { value: String(totalStaff), label: `${activeStaff} active • ${staffOnLeave} on leave • ${pendingStaffSalary} salary pending • ₹${staffSalaryLoad} salary load` },
      parents: { value: String(totalParents), label: `${activeParents} active • ${totalParentChildren} children • ${portalEnabledParents} portal enabled • ${followupParents} follow-up • ${parentFeePending} fee alerts` },
      progress: { value: String(totalProgressReports), label: `${avgProgressScore}% avg score • ${excellentProgressReports} excellent • ${needsAttentionProgressReports} need attention • ${sharedProgressReports} shared` },
      courses: { value: String(totalCourses), label: `${activeCourses} active • ${upcomingCourses} upcoming` },
      batches: { value: String(totalBatches), label: `${activeBatches} active • ${upcomingBatches} upcoming` },
      attendance: { value: String(totalAttendanceSessions), label: `${attendancePercent}% attendance • ${attendanceStudents} marked` },
      fees: { value: `₹${pendingFeesAmount}`, label: `${totalFeeRecords} records • ₹${paidFees} collected • ${overdueFeeRecords} overdue` },
      payments: { value: `₹${paidPaymentAmount}`, label: `${totalPaymentRecords} records • ₹${pendingPaymentAmount} pending • ${failedPaymentRecords} failed` },
      doubts: { value: String(totalDoubts), label: `${solvedDoubts} solved • ${reviewDoubts} review needed` },
      aiNotes: { value: String(totalAiNotes), label: `AI class notes generated • local template active` },
      notifications: { value: String(totalNotifications), label: `${sentNotifications} sent • ${scheduledNotifications} scheduled • ${failedNotifications} failed` },
      assignments: { value: String(totalAssignments), label: `${activeAssignments} active • ${pendingAssignments} pending • ${checkedAssignments} checked` },
      tests: { value: String(totalTests), label: `${scheduledTests} scheduled • ${completedTests} completed • ${publishedTests} published • ${testPassPercent}% pass` },
      testBuilder: { value: String(totalQuestionPapers), label: `${totalQuestionPaperQuestions} questions • ${publishedQuestionPapers} published • ${liveQuestionPapers} live • ${draftQuestionPapers} drafts` },
      questionBank: { value: String(totalQuestionBankItems), label: `${approvedQuestionBankItems} approved • ${draftQuestionBankItems} drafts • ${hardQuestionBankItems} hard • ${totalQuestionBankUsage} reused` },
      timetable: { value: String(totalTimetableSlots), label: `${activeTimetableSlots} active • ${draftTimetableSlots} drafts • ${onlineTimetableSlots} online • ${priorityTimetableSlots} priority` },
      enquiries: { value: String(totalEnquiries), label: `${hotEnquiries} hot • ${followUpEnquiries} follow-up • ${convertedEnquiries} converted • ${dueEnquiries} due` },
      followups: { value: String(dueEnquiries), label: `${hotEnquiries} hot priority • ${followUpEnquiries} active follow-up • ${convertedEnquiries} converted` },
      announcements: { value: String(totalAnnouncements), label: `${publishedAnnouncements} published • ${urgentAnnouncements} urgent` },
      certificates: { value: String(totalCertificates), label: `${issuedCertificates} issued • ${totalIdCards} ID cards • ${revokedDocuments} revoked` },
      library: { value: String(totalLibraryItems), label: `${activeLibraryItems} active • ${digitalLibraryItems} digital • ${issuedLibraryItems} issued • ${overdueLibraryItems} overdue` },
      finance: { value: `₹${netProfit}`, label: `${totalFinanceRecords} records • ₹${financeIncome} income • ₹${financeExpense} expense • ₹${financePending} pending` },
    };

    const dashboardCards = (roleCards[role] || roleCards.student).map((card) => {
      if (!card.type) return card;
      return { ...card, ...stats[card.type] };
    });

    res.json({
      success: true,
      greeting: `Welcome back, ${req.user.name}`,
      institute: req.user.instituteName || "NAXORA Institute",
      role,
      cards: dashboardCards,
      roadmapModules,
      quickActions: [
        "Add new student",
        "Add new teacher",
        "Add staff member",
        "View staff",
        "Add parent profile",
        "View parent portal",
        "Add progress report",
        "View progress",
        "Create course",
        "Create batch",
        "View courses and batches",
        "Mark attendance",
        "View attendance report",
        "Add fee record",
        "View fee collection",
        "Ask AI doubt",
        "View doubt history",
        "Create notification",
        "View notifications",
        "Add homework",
        "View assignments",
        "Create test",
        "View results",
        "Build question paper",
        "View question papers",
        "Add bank question",
        "View question bank",
        "Add timetable slot",
        "View weekly timetable",
        "Add enquiry",
        "View enquiries",
        "Today follow-ups",
        "Hot lead board",
      "Add subscription",
      "View subscriptions",
        "Add payment record",
        "View payments",
        "Create announcement",
        "View announcements",
        "Create certificate",
        "Generate ID card",
        "Add study material",
        "View library",
        "Add income",
        "Add expense",
        "View finance report",
      ],
    });
  } catch (error) {
    next(error);
  }
}
