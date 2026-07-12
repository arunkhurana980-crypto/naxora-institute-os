import Teacher from "../models/Teacher.js";

function toTeacherResponse(teacher) {
  return {
    id: teacher._id,
    name: teacher.name,
    email: teacher.email,
    phone: teacher.phone,
    gender: teacher.gender,
    subject: teacher.subject,
    courseName: teacher.courseName,
    batchName: teacher.batchName,
    qualification: teacher.qualification,
    experienceYears: teacher.experienceYears,
    salaryType: teacher.salaryType,
    salaryAmount: teacher.salaryAmount,
    salaryStatus: teacher.salaryStatus,
    joiningDate: teacher.joiningDate,
    status: teacher.status,
    address: teacher.address,
    notes: teacher.notes,
    instituteName: teacher.instituteName,
    createdAt: teacher.createdAt,
    updatedAt: teacher.updatedAt,
  };
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function normalizePayload(body) {
  return {
    name: body.name?.trim(),
    email: body.email?.trim().toLowerCase() || "",
    phone: body.phone?.trim() || "",
    gender: body.gender || "not_set",
    subject: body.subject?.trim() || "",
    courseName: body.courseName?.trim() || "",
    batchName: body.batchName?.trim() || "",
    qualification: body.qualification?.trim() || "",
    experienceYears: toNumber(body.experienceYears),
    salaryType: body.salaryType || "not_set",
    salaryAmount: toNumber(body.salaryAmount),
    salaryStatus: body.salaryStatus || "not_set",
    status: body.status || "active",
    address: body.address?.trim() || "",
    notes: body.notes?.trim() || "",
  };
}

export async function createTeacher(req, res, next) {
  try {
    const payload = normalizePayload(req.body);

    if (!payload.name) {
      return res.status(400).json({ success: false, message: "Teacher name required hai" });
    }

    const teacher = await Teacher.create({
      ...payload,
      instituteName: req.user.instituteName || "NAXORA Institute",
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Teacher successfully add ho gaya",
      teacher: toTeacherResponse(teacher),
    });
  } catch (error) {
    next(error);
  }
}

export async function getTeachers(req, res, next) {
  try {
    const { search = "", status = "", salaryStatus = "" } = req.query;
    const filter = { createdBy: req.user._id };

    if (status) filter.status = status;
    if (salaryStatus) filter.salaryStatus = salaryStatus;
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { subject: regex },
        { courseName: regex },
        { batchName: regex },
        { qualification: regex },
      ];
    }

    const teachers = await Teacher.find(filter).sort({ createdAt: -1 });
    const total = await Teacher.countDocuments({ createdBy: req.user._id });
    const active = await Teacher.countDocuments({ createdBy: req.user._id, status: "active" });
    const pendingSalary = await Teacher.countDocuments({ createdBy: req.user._id, salaryStatus: "pending" });

    res.json({
      success: true,
      count: teachers.length,
      total,
      active,
      pendingSalary,
      teachers: teachers.map(toTeacherResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function getTeacherById(req, res, next) {
  try {
    const teacher = await Teacher.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher nahi mila" });
    }

    res.json({ success: true, teacher: toTeacherResponse(teacher) });
  } catch (error) {
    next(error);
  }
}

export async function updateTeacher(req, res, next) {
  try {
    const payload = normalizePayload(req.body);
    if (!payload.name) {
      return res.status(400).json({ success: false, message: "Teacher name required hai" });
    }

    const teacher = await Teacher.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher nahi mila" });
    }

    res.json({
      success: true,
      message: "Teacher update ho gaya",
      teacher: toTeacherResponse(teacher),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteTeacher(req, res, next) {
  try {
    const teacher = await Teacher.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher nahi mila" });
    }

    res.json({ success: true, message: "Teacher delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
