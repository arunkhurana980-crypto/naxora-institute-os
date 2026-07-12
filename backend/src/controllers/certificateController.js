import Certificate from "../models/Certificate.js";

function clean(value = "") {
  return String(value || "").trim();
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function dateValue(value, fallback = undefined) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function buildPayload(body, user) {
  const documentType = enumValue(body.documentType, ["certificate", "id-card"], "certificate");
  return {
    documentType,
    certificateType: enumValue(body.certificateType, ["course-completion", "achievement", "participation", "internship", "id-card"], documentType === "id-card" ? "id-card" : "course-completion"),
    certificateTitle: clean(body.certificateTitle),
    documentNumber: clean(body.documentNumber),
    studentName: clean(body.studentName),
    studentEmail: clean(body.studentEmail).toLowerCase(),
    rollNo: clean(body.rollNo),
    batchName: clean(body.batchName),
    courseName: clean(body.courseName),
    duration: clean(body.duration),
    grade: clean(body.grade),
    skillsCovered: clean(body.skillsCovered),
    issueDate: dateValue(body.issueDate, new Date()),
    validUntil: dateValue(body.validUntil, undefined),
    status: enumValue(body.status, ["draft", "issued", "revoked"], "issued"),
    photoUrl: clean(body.photoUrl),
    phone: clean(body.phone),
    bloodGroup: clean(body.bloodGroup),
    emergencyContact: clean(body.emergencyContact),
    address: clean(body.address),
    authorizedBy: clean(body.authorizedBy) || "Institute Director",
    designation: clean(body.designation) || "Director",
    instituteName: user.instituteName || clean(body.instituteName) || "NAXORA Institute",
    instituteAddress: clean(body.instituteAddress) || "Premium AI Powered Coaching Institute",
    verificationNote: clean(body.verificationNote),
    createdBy: user._id,
  };
}

function validatePayload(payload) {
  if (!payload.certificateTitle) return "Certificate / ID title required hai";
  if (!payload.studentName) return "Student name required hai";
  if (payload.documentType === "certificate" && !payload.courseName) return "Certificate ke liye course name required hai";
  if (payload.studentEmail && !/^\S+@\S+\.\S+$/.test(payload.studentEmail)) return "Student email valid nahi hai";
  if (payload.photoUrl && !/^https?:\/\//i.test(payload.photoUrl)) return "Photo URL http:// ya https:// se start hona chahiye";
  return "";
}

function toResponse(item) {
  return {
    id: item._id,
    documentType: item.documentType,
    certificateType: item.certificateType,
    certificateTitle: item.certificateTitle,
    documentNumber: item.documentNumber,
    studentName: item.studentName,
    studentEmail: item.studentEmail,
    rollNo: item.rollNo,
    batchName: item.batchName,
    courseName: item.courseName,
    duration: item.duration,
    grade: item.grade,
    skillsCovered: item.skillsCovered,
    issueDate: item.issueDate,
    validUntil: item.validUntil,
    status: item.status,
    photoUrl: item.photoUrl,
    phone: item.phone,
    bloodGroup: item.bloodGroup,
    emergencyContact: item.emergencyContact,
    address: item.address,
    authorizedBy: item.authorizedBy,
    designation: item.designation,
    instituteName: item.instituteName,
    instituteAddress: item.instituteAddress,
    verificationNote: item.verificationNote,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function createCertificate(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const doc = await Certificate.create(payload);
    res.status(201).json({ success: true, message: payload.documentType === "id-card" ? "ID card create ho gaya" : "Certificate create ho gaya", certificate: toResponse(doc) });
  } catch (error) {
    next(error);
  }
}

export async function getCertificates(req, res, next) {
  try {
    const { search = "", documentType = "", certificateType = "", status = "" } = req.query;
    const owner = { createdBy: req.user._id };
    const filter = { ...owner };

    if (documentType.trim()) filter.documentType = documentType.trim();
    if (certificateType.trim()) filter.certificateType = certificateType.trim();
    if (status.trim()) filter.status = status.trim();

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { studentName: regex },
        { studentEmail: regex },
        { rollNo: regex },
        { batchName: regex },
        { courseName: regex },
        { certificateTitle: regex },
        { documentNumber: regex },
      ];
    }

    const certificates = await Certificate.find(filter).sort({ issueDate: -1, createdAt: -1 }).limit(150);
    const all = await Certificate.find(owner).select("documentType certificateType status validUntil issueDate");
    const now = new Date();

    const summary = all.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.documentType === "certificate") acc.certificates += 1;
        if (item.documentType === "id-card") acc.idCards += 1;
        acc[item.status] = (acc[item.status] || 0) + 1;
        if (item.validUntil && item.validUntil < now) acc.expired += 1;
        if (item.issueDate && item.issueDate > now) acc.scheduled += 1;
        acc.types.add(item.certificateType);
        return acc;
      },
      { total: 0, certificates: 0, idCards: 0, draft: 0, issued: 0, revoked: 0, expired: 0, scheduled: 0, types: new Set() }
    );

    res.json({
      success: true,
      count: certificates.length,
      totalDocuments: summary.total,
      certificatesCount: summary.certificates,
      idCardsCount: summary.idCards,
      issuedCount: summary.issued,
      draftCount: summary.draft,
      revokedCount: summary.revoked,
      expiredCount: summary.expired,
      scheduledCount: summary.scheduled,
      typeCount: summary.types.size,
      certificates: certificates.map(toResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function getCertificateById(req, res, next) {
  try {
    const doc = await Certificate.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: "Certificate / ID card nahi mila" });
    res.json({ success: true, certificate: toResponse(doc) });
  } catch (error) {
    next(error);
  }
}

export async function updateCertificate(req, res, next) {
  try {
    const payload = buildPayload(req.body, req.user);
    delete payload.createdBy;
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ success: false, message: error });

    const doc = await Certificate.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      payload,
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Certificate / ID card nahi mila" });
    res.json({ success: true, message: "Certificate / ID card update ho gaya", certificate: toResponse(doc) });
  } catch (error) {
    next(error);
  }
}

export async function updateCertificateStatus(req, res, next) {
  try {
    const status = enumValue(req.body.status, ["draft", "issued", "revoked"], "issued");
    const doc = await Certificate.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Certificate / ID card nahi mila" });
    res.json({ success: true, message: `Status ${status} ho gaya`, certificate: toResponse(doc) });
  } catch (error) {
    next(error);
  }
}

export async function deleteCertificate(req, res, next) {
  try {
    const doc = await Certificate.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: "Certificate / ID card nahi mila" });
    res.json({ success: true, message: "Certificate / ID card delete ho gaya" });
  } catch (error) {
    next(error);
  }
}
