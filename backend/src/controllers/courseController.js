import Course from "../models/Course.js";

function toCourseResponse(course) {
  return {
    id: course._id,
    name: course.name,
    code: course.code,
    category: course.category,
    level: course.level,
    duration: course.duration,
    mode: course.mode,
    totalFees: course.totalFees,
    status: course.status,
    description: course.description,
    instituteName: course.instituteName,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

function normalizePayload(body) {
  return {
    name: body.name?.trim(),
    code: body.code?.trim().toUpperCase() || "",
    category: body.category?.trim() || "",
    level: body.level || "beginner",
    duration: body.duration?.trim() || "",
    mode: body.mode || "offline",
    totalFees: Number(body.totalFees || 0),
    status: body.status || "active",
    description: body.description?.trim() || "",
  };
}

export async function createCourse(req, res, next) {
  try {
    const payload = normalizePayload(req.body);
    if (!payload.name) {
      return res.status(400).json({ success: false, message: "Course name required hai" });
    }

    const course = await Course.create({
      ...payload,
      instituteName: req.user.instituteName || "NAXORA Institute",
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Course successfully add ho gaya",
      course: toCourseResponse(course),
    });
  } catch (error) {
    next(error);
  }
}

export async function getCourses(req, res, next) {
  try {
    const { search = "", status = "", mode = "" } = req.query;
    const owner = { createdBy: req.user._id };
    const filter = { ...owner };

    if (status) filter.status = status;
    if (mode) filter.mode = mode;
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ name: regex }, { code: regex }, { category: regex }, { duration: regex }];
    }

    const [courses, total, active, upcoming] = await Promise.all([
      Course.find(filter).sort({ createdAt: -1 }),
      Course.countDocuments(owner),
      Course.countDocuments({ ...owner, status: "active" }),
      Course.countDocuments({ ...owner, status: "upcoming" }),
    ]);

    res.json({
      success: true,
      count: courses.length,
      total,
      active,
      upcoming,
      courses: courses.map(toCourseResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function getCourseById(req, res, next) {
  try {
    const course = await Course.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!course) return res.status(404).json({ success: false, message: "Course nahi mila" });
    res.json({ success: true, course: toCourseResponse(course) });
  } catch (error) {
    next(error);
  }
}

export async function updateCourse(req, res, next) {
  try {
    const payload = normalizePayload(req.body);
    if (!payload.name) {
      return res.status(400).json({ success: false, message: "Course name required hai" });
    }

    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );

    if (!course) return res.status(404).json({ success: false, message: "Course nahi mila" });

    res.json({
      success: true,
      message: "Course update ho gaya",
      course: toCourseResponse(course),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCourse(req, res, next) {
  try {
    const course = await Course.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!course) return res.status(404).json({ success: false, message: "Course nahi mila" });
    res.json({ success: true, message: "Course delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
