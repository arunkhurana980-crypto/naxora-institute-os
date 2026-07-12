import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
import Attendance from "../models/Attendance.js";
import Fee from "../models/Fee.js";
import Doubt from "../models/Doubt.js";
import Assignment from "../models/Assignment.js";
import TestResult from "../models/TestResult.js";

function round(value = 0) {
  return Math.round(Number(value || 0));
}

function percent(part = 0, total = 0) {
  if (!total) return 0;
  return Math.round((Number(part || 0) / Number(total || 0)) * 100);
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

async function countByStatus(Model, owner, field = "status") {
  const rows = await Model.aggregate([
    { $match: owner },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return rows.reduce((acc, row) => ({ ...acc, [row._id || "not_set"]: row.count }), {});
}

async function latestActivity(owner) {
  const [students, fees, tests, attendance, assignments, doubts] = await Promise.all([
    Student.find(owner).select("name courseName batchName createdAt").sort({ createdAt: -1 }).limit(3),
    Fee.find(owner).select("studentName paidAmount status month createdAt").sort({ createdAt: -1 }).limit(3),
    TestResult.find(owner).select("testTitle subject status examDate createdAt").sort({ createdAt: -1 }).limit(3),
    Attendance.find(owner).select("batchName attendanceDate presentCount totalStudents createdAt").sort({ createdAt: -1 }).limit(3),
    Assignment.find(owner).select("title subject status dueDate createdAt").sort({ createdAt: -1 }).limit(3),
    Doubt.find(owner).select("studentName subject status createdAt").sort({ createdAt: -1 }).limit(3),
  ]);

  const items = [
    ...students.map((item) => ({ type: "Student", title: item.name, detail: `${item.courseName || "Course"} • ${item.batchName || "Batch"}`, date: item.createdAt })),
    ...fees.map((item) => ({ type: "Fees", title: item.studentName, detail: `${item.status} • ₹${item.paidAmount || 0} • ${item.month}`, date: item.createdAt })),
    ...tests.map((item) => ({ type: "Test", title: item.testTitle, detail: `${item.subject} • ${item.status}`, date: item.createdAt || item.examDate })),
    ...attendance.map((item) => ({ type: "Attendance", title: item.batchName, detail: `${item.presentCount || 0}/${item.totalStudents || 0} present`, date: item.createdAt || item.attendanceDate })),
    ...assignments.map((item) => ({ type: "Assignment", title: item.title, detail: `${item.subject} • ${item.status}`, date: item.createdAt || item.dueDate })),
    ...doubts.map((item) => ({ type: "AI Doubt", title: item.studentName, detail: `${item.subject} • ${item.status}`, date: item.createdAt })),
  ];

  return items
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 12);
}

export async function getReports(req, res, next) {
  try {
    const owner = { createdBy: req.user._id };
    const monthStart = startOfMonth();

    const [
      totalStudents,
      activeStudents,
      totalTeachers,
      activeTeachers,
      totalCourses,
      totalBatches,
      studentStatus,
      teacherStatus,
      feeAgg,
      currentMonthFeeAgg,
      feesByStatus,
      attendanceAgg,
      attendanceByBatch,
      testDocs,
      assignmentsByStatus,
      doubtsByStatus,
      recent,
    ] = await Promise.all([
      Student.countDocuments(owner),
      Student.countDocuments({ ...owner, status: "active" }),
      Teacher.countDocuments(owner),
      Teacher.countDocuments({ ...owner, status: "active" }),
      Course.countDocuments(owner),
      Batch.countDocuments(owner),
      countByStatus(Student, owner, "status"),
      countByStatus(Teacher, owner, "status"),
      Fee.aggregate([
        { $match: owner },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$totalAmount" },
            paidAmount: { $sum: "$paidAmount" },
            pendingAmount: { $sum: "$pendingAmount" },
            discount: { $sum: "$discount" },
            records: { $sum: 1 },
          },
        },
      ]),
      Fee.aggregate([
        { $match: { ...owner, createdAt: { $gte: monthStart } } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$totalAmount" },
            paidAmount: { $sum: "$paidAmount" },
            pendingAmount: { $sum: "$pendingAmount" },
            records: { $sum: 1 },
          },
        },
      ]),
      countByStatus(Fee, owner, "status"),
      Attendance.aggregate([
        { $match: owner },
        {
          $group: {
            _id: null,
            sessions: { $sum: 1 },
            totalStudents: { $sum: "$totalStudents" },
            present: { $sum: "$presentCount" },
            absent: { $sum: "$absentCount" },
            late: { $sum: "$lateCount" },
            leave: { $sum: "$leaveCount" },
          },
        },
      ]),
      Attendance.aggregate([
        { $match: owner },
        {
          $group: {
            _id: "$batchName",
            sessions: { $sum: 1 },
            totalStudents: { $sum: "$totalStudents" },
            present: { $sum: "$presentCount" },
            absent: { $sum: "$absentCount" },
            late: { $sum: "$lateCount" },
          },
        },
        { $sort: { sessions: -1 } },
        { $limit: 8 },
      ]),
      TestResult.find(owner).select("testTitle subject batchName totalMarks status results examDate").sort({ examDate: -1 }).limit(100),
      countByStatus(Assignment, owner, "status"),
      countByStatus(Doubt, owner, "status"),
      latestActivity(owner),
    ]);

    const fees = feeAgg[0] || { totalAmount: 0, paidAmount: 0, pendingAmount: 0, discount: 0, records: 0 };
    const monthFees = currentMonthFeeAgg[0] || { totalAmount: 0, paidAmount: 0, pendingAmount: 0, records: 0 };
    const attendance = attendanceAgg[0] || { sessions: 0, totalStudents: 0, present: 0, absent: 0, late: 0, leave: 0 };

    const allResultRows = testDocs.flatMap((test) => safeArray(test.results).map((row) => ({
      testTitle: test.testTitle,
      subject: test.subject,
      batchName: test.batchName,
      totalMarks: test.totalMarks || 100,
      examDate: test.examDate,
      studentName: row.studentName,
      marksObtained: row.marksObtained || 0,
      resultStatus: row.resultStatus || "pending",
      percentage: percent(row.marksObtained || 0, test.totalMarks || 100),
    })));

    const passRows = allResultRows.filter((row) => row.resultStatus === "pass");
    const failRows = allResultRows.filter((row) => row.resultStatus === "fail");
    const absentRows = allResultRows.filter((row) => row.resultStatus === "absent");
    const scoredRows = allResultRows.filter((row) => row.resultStatus !== "absent");
    const averagePercent = scoredRows.length ? round(scoredRows.reduce((sum, row) => sum + row.percentage, 0) / scoredRows.length) : 0;

    const topStudents = [...scoredRows]
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 8);

    const weakStudents = [...scoredRows]
      .filter((row) => row.resultStatus === "fail" || row.percentage < 50)
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 8);

    const subjectMap = new Map();
    for (const row of scoredRows) {
      const key = row.subject || "General";
      const data = subjectMap.get(key) || { subject: key, rows: 0, totalPercent: 0, pass: 0, fail: 0 };
      data.rows += 1;
      data.totalPercent += row.percentage;
      if (row.resultStatus === "pass") data.pass += 1;
      if (row.resultStatus === "fail") data.fail += 1;
      subjectMap.set(key, data);
    }

    const subjectPerformance = [...subjectMap.values()].map((item) => ({
      subject: item.subject,
      rows: item.rows,
      averagePercent: percent(item.totalPercent, item.rows * 100),
      passPercent: percent(item.pass, item.rows),
      fail: item.fail,
    })).sort((a, b) => b.averagePercent - a.averagePercent).slice(0, 8);

    const batchPerformance = attendanceByBatch.map((item) => ({
      batchName: item._id || "Not set",
      sessions: item.sessions,
      totalStudents: item.totalStudents,
      present: item.present,
      absent: item.absent,
      late: item.late,
      attendancePercent: percent(item.present + item.late, item.totalStudents),
    }));

    res.json({
      success: true,
      generatedAt: new Date(),
      instituteName: req.user.instituteName || "NAXORA Institute",
      overview: {
        totalStudents,
        activeStudents,
        totalTeachers,
        activeTeachers,
        totalCourses,
        totalBatches,
        totalTests: testDocs.length,
        totalResultRows: allResultRows.length,
        activePercent: percent(activeStudents, totalStudents),
      },
      studentReport: { totalStudents, activeStudents, status: studentStatus },
      teacherReport: { totalTeachers, activeTeachers, status: teacherStatus },
      feesReport: {
        totalAmount: round(fees.totalAmount),
        paidAmount: round(fees.paidAmount),
        pendingAmount: round(fees.pendingAmount),
        discount: round(fees.discount),
        records: fees.records || 0,
        collectionPercent: percent(fees.paidAmount, fees.totalAmount),
        currentMonthPaid: round(monthFees.paidAmount),
        currentMonthPending: round(monthFees.pendingAmount),
        status: feesByStatus,
      },
      attendanceReport: {
        sessions: attendance.sessions || 0,
        totalStudentsMarked: attendance.totalStudents || 0,
        present: attendance.present || 0,
        absent: attendance.absent || 0,
        late: attendance.late || 0,
        leave: attendance.leave || 0,
        attendancePercent: percent((attendance.present || 0) + (attendance.late || 0), attendance.totalStudents || 0),
        byBatch: batchPerformance,
      },
      testReport: {
        totalTests: testDocs.length,
        totalResultRows: allResultRows.length,
        passRows: passRows.length,
        failRows: failRows.length,
        absentRows: absentRows.length,
        passPercent: percent(passRows.length, passRows.length + failRows.length),
        averagePercent,
        topStudents,
        weakStudents,
        subjectPerformance,
      },
      assignmentReport: { status: assignmentsByStatus },
      doubtReport: { status: doubtsByStatus },
      recentActivity: recent,
    });
  } catch (error) {
    next(error);
  }
}
