import Student from "../models/Student.js";

function toStudentResponse(student) {
  return {
    id: student._id,
    name: student.name,
    email: student.email,
    phone: student.phone,
    gender: student.gender,
    classLevel: student.classLevel,
    courseName: student.courseName,
    batchName: student.batchName,
    guardianName: student.guardianName,
    guardianPhone: student.guardianPhone,
    address: student.address,
    admissionDate: student.admissionDate,
    feesStatus: student.feesStatus,
    status: student.status,
    notes: student.notes,
    instituteName: student.instituteName,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
  };
}

function normalizePayload(body) {
  return {
    name: body.name?.trim(),
    email: body.email?.trim().toLowerCase() || "",
    phone: body.phone?.trim() || "",
    gender: body.gender || "not_set",
    classLevel: body.classLevel?.trim() || "",
    courseName: body.courseName?.trim() || "",
    batchName: body.batchName?.trim() || "",
    guardianName: body.guardianName?.trim() || "",
    guardianPhone: body.guardianPhone?.trim() || "",
    address: body.address?.trim() || "",
    feesStatus: body.feesStatus || "pending",
    status: body.status || "active",
    notes: body.notes?.trim() || "",
  };
}

export async function createStudent(req, res, next) {
  try {
    const payload = normalizePayload(req.body);

    if (!payload.name) {
      return res.status(400).json({ success: false, message: "Student name required hai" });
    }

    const student = await Student.create({
      ...payload,
      instituteName: req.user.instituteName || "NAXORA Institute",
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Student successfully add ho gaya",
      student: toStudentResponse(student),
    });
  } catch (error) {
    next(error);
  }
}

export async function getStudents(req, res, next) {
  try {
    const { search = "", status = "", feesStatus = "" } = req.query;
    const filter = { createdBy: req.user._id };

    if (status) filter.status = status;
    if (feesStatus) filter.feesStatus = feesStatus;
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { courseName: regex },
        { batchName: regex },
        { classLevel: regex },
      ];
    }

    const students = await Student.find(filter).sort({ createdAt: -1 });
    const total = await Student.countDocuments({ createdBy: req.user._id });
    const active = await Student.countDocuments({ createdBy: req.user._id, status: "active" });
    const pendingFees = await Student.countDocuments({ createdBy: req.user._id, feesStatus: "pending" });

    res.json({
      success: true,
      count: students.length,
      total,
      active,
      pendingFees,
      students: students.map(toStudentResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function getStudentById(req, res, next) {
  try {
    const student = await Student.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student nahi mila" });
    }

    res.json({ success: true, student: toStudentResponse(student) });
  } catch (error) {
    next(error);
  }
}

export async function updateStudent(req, res, next) {
  try {
    const payload = normalizePayload(req.body);
    if (!payload.name) {
      return res.status(400).json({ success: false, message: "Student name required hai" });
    }

    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({ success: false, message: "Student nahi mila" });
    }

    res.json({
      success: true,
      message: "Student update ho gaya",
      student: toStudentResponse(student),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteStudent(req, res, next) {
  try {
    const student = await Student.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student nahi mila" });
    }

    res.json({ success: true, message: "Student delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
