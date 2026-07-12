import InstituteListing from "../models/InstituteListing.js";
import DiscoveryLead from "../models/DiscoveryLead.js";

function clean(value = "") { return String(value || "").trim(); }
function arrayValue(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).slice(0, 30);
  return clean(value).split(",").map(clean).filter(Boolean).slice(0, 30);
}
function enumValue(value, allowed, fallback) { return allowed.includes(value) ? value : fallback; }
function numberValue(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : fallback; }
function listingOwnerFilter(user) { return { createdBy: user._id }; }

function buildListingPayload(body, user) {
  return {
    instituteName: clean(body.instituteName) || user.instituteName || "NAXORA Partner Institute",
    tagline: clean(body.tagline),
    ownerName: clean(body.ownerName) || user.name || "",
    phone: clean(body.phone),
    whatsapp: clean(body.whatsapp) || clean(body.phone),
    email: clean(body.email).toLowerCase(),
    city: clean(body.city),
    area: clean(body.area),
    district: clean(body.district),
    state: clean(body.state) || "Haryana",
    address: clean(body.address),
    courses: arrayValue(body.courses),
    classLevels: arrayValue(body.classLevels),
    feesRange: clean(body.feesRange) || "Contact institute",
    mode: enumValue(body.mode, ["offline", "online", "hybrid"], "offline"),
    logoUrl: clean(body.logoUrl),
    coverUrl: clean(body.coverUrl),
    description: clean(body.description),
    facilities: arrayValue(body.facilities),
    rating: Math.min(numberValue(body.rating, 4.5), 5),
    verifiedByNaxora: body.verifiedByNaxora !== false,
    isPublished: body.isPublished !== false,
    subscriptionStatus: enumValue(body.subscriptionStatus, ["trial", "active", "premium", "paused", "expired"], "active"),
    createdBy: user._id,
  };
}

function validateListing(payload) {
  if (!payload.instituteName) return "Institute name required hai";
  if (!payload.phone) return "Phone number required hai";
  if (!payload.city) return "City required hai";
  if (!payload.courses.length) return "Minimum 1 course add karo";
  return "";
}

function listingToResponse(item) {
  return {
    id: item._id,
    instituteName: item.instituteName,
    tagline: item.tagline,
    ownerName: item.ownerName,
    phone: item.phone,
    whatsapp: item.whatsapp,
    email: item.email,
    city: item.city,
    area: item.area,
    district: item.district,
    state: item.state,
    address: item.address,
    courses: item.courses || [],
    classLevels: item.classLevels || [],
    feesRange: item.feesRange,
    mode: item.mode,
    logoUrl: item.logoUrl,
    coverUrl: item.coverUrl,
    description: item.description,
    facilities: item.facilities || [],
    rating: item.rating,
    verifiedByNaxora: item.verifiedByNaxora,
    isPublished: item.isPublished,
    subscriptionStatus: item.subscriptionStatus,
    leadCount: item.leadCount || 0,
    profileViews: item.profileViews || 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function leadToResponse(lead) {
  return {
    id: lead._id,
    instituteListing: lead.instituteListing,
    instituteName: lead.instituteName,
    studentName: lead.studentName,
    parentName: lead.parentName,
    phone: lead.phone,
    email: lead.email,
    city: lead.city,
    area: lead.area,
    classLevel: lead.classLevel,
    interestedCourse: lead.interestedCourse,
    message: lead.message,
    status: lead.status,
    leadTemperature: lead.leadTemperature,
    notes: lead.notes,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

async function buildOwnerSummary(user) {
  const ownerFilter = { instituteOwner: user._id };
  const [listings, leads, newLeads, converted, hotLeads] = await Promise.all([
    InstituteListing.countDocuments(listingOwnerFilter(user)),
    DiscoveryLead.countDocuments(ownerFilter),
    DiscoveryLead.countDocuments({ ...ownerFilter, status: "new" }),
    DiscoveryLead.countDocuments({ ...ownerFilter, status: "converted" }),
    DiscoveryLead.countDocuments({ ...ownerFilter, leadTemperature: "hot" }),
  ]);
  return { totalListings: listings, totalLeads: leads, newLeads, convertedLeads: converted, hotLeads };
}

export async function getPublicListings(req, res, next) {
  try {
    const { search = "", city = "", area = "", course = "", mode = "" } = req.query;
    const filter = {
      isPublished: true,
      verifiedByNaxora: true,
      subscriptionStatus: { $in: ["trial", "active", "premium"] },
    };
    if (city.trim()) filter.city = new RegExp(city.trim(), "i");
    if (area.trim()) filter.area = new RegExp(area.trim(), "i");
    if (course.trim()) filter.courses = { $elemMatch: { $regex: course.trim(), $options: "i" } };
    if (["offline", "online", "hybrid"].includes(mode.trim())) filter.mode = mode.trim();
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ instituteName: regex }, { city: regex }, { area: regex }, { courses: regex }, { classLevels: regex }, { description: regex }];
    }
    const listings = await InstituteListing.find(filter).sort({ subscriptionStatus: 1, rating: -1, leadCount: -1 }).limit(80);
    res.json({ success: true, total: listings.length, listings: listings.map(listingToResponse) });
  } catch (error) { next(error); }
}

export async function createPublicLead(req, res, next) {
  try {
    const listing = await InstituteListing.findOne({
      _id: req.body.instituteListingId,
      isPublished: true,
      verifiedByNaxora: true,
      subscriptionStatus: { $in: ["trial", "active", "premium"] },
    });
    if (!listing) return res.status(404).json({ success: false, message: "Institute listing active nahi mili" });
    const payload = {
      instituteListing: listing._id,
      instituteOwner: listing.createdBy,
      instituteName: listing.instituteName,
      studentName: clean(req.body.studentName),
      parentName: clean(req.body.parentName),
      phone: clean(req.body.phone),
      email: clean(req.body.email).toLowerCase(),
      city: clean(req.body.city) || listing.city,
      area: clean(req.body.area),
      classLevel: clean(req.body.classLevel),
      interestedCourse: clean(req.body.interestedCourse),
      message: clean(req.body.message),
      leadTemperature: enumValue(req.body.leadTemperature, ["hot", "warm", "cold"], "warm"),
      source: "student_discovery",
    };
    if (!payload.studentName) return res.status(400).json({ success: false, message: "Student name required hai" });
    if (!payload.phone) return res.status(400).json({ success: false, message: "Phone required hai" });
    if (!payload.interestedCourse) return res.status(400).json({ success: false, message: "Interested course required hai" });
    const lead = await DiscoveryLead.create(payload);
    await InstituteListing.updateOne({ _id: listing._id }, { $inc: { leadCount: 1 } });
    res.status(201).json({ success: true, message: "Lead institute ko receive ho gayi. Institute owner tumse contact karega.", lead: leadToResponse(lead) });
  } catch (error) { next(error); }
}

export async function getMyListings(req, res, next) {
  try {
    const listings = await InstituteListing.find(listingOwnerFilter(req.user)).sort({ updatedAt: -1 }).limit(50);
    const summary = await buildOwnerSummary(req.user);
    res.json({ success: true, ...summary, listings: listings.map(listingToResponse) });
  } catch (error) { next(error); }
}

export async function createListing(req, res, next) {
  try {
    const payload = buildListingPayload(req.body, req.user);
    const error = validateListing(payload);
    if (error) return res.status(400).json({ success: false, message: error });
    const listing = await InstituteListing.create(payload);
    res.status(201).json({ success: true, message: "Institute discovery listing publish ho gayi", listing: listingToResponse(listing) });
  } catch (error) { next(error); }
}

export async function updateListing(req, res, next) {
  try {
    const payload = buildListingPayload(req.body, req.user);
    delete payload.createdBy;
    const error = validateListing({ ...payload, createdBy: req.user._id });
    if (error) return res.status(400).json({ success: false, message: error });
    const listing = await InstituteListing.findOneAndUpdate({ _id: req.params.id, createdBy: req.user._id }, payload, { new: true, runValidators: true });
    if (!listing) return res.status(404).json({ success: false, message: "Listing nahi mili" });
    res.json({ success: true, message: "Listing update ho gayi", listing: listingToResponse(listing) });
  } catch (error) { next(error); }
}

export async function deleteListing(req, res, next) {
  try {
    const listing = await InstituteListing.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!listing) return res.status(404).json({ success: false, message: "Listing nahi mili" });
    res.json({ success: true, message: "Listing delete ho gayi" });
  } catch (error) { next(error); }
}

export async function getMyLeads(req, res, next) {
  try {
    const { status = "", search = "" } = req.query;
    const filter = { instituteOwner: req.user._id };
    if (status.trim()) filter.status = status.trim();
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ studentName: regex }, { phone: regex }, { interestedCourse: regex }, { city: regex }, { area: regex }, { instituteName: regex }];
    }
    const [leads, summary] = await Promise.all([
      DiscoveryLead.find(filter).sort({ createdAt: -1 }).limit(200),
      buildOwnerSummary(req.user),
    ]);
    res.json({ success: true, ...summary, leads: leads.map(leadToResponse) });
  } catch (error) { next(error); }
}

export async function updateLeadStatus(req, res, next) {
  try {
    const update = {
      status: enumValue(req.body.status, ["new", "contacted", "demo_booked", "converted", "not_interested", "lost"], "contacted"),
      leadTemperature: enumValue(req.body.leadTemperature, ["hot", "warm", "cold"], "warm"),
      notes: clean(req.body.notes),
    };
    const lead = await DiscoveryLead.findOneAndUpdate({ _id: req.params.id, instituteOwner: req.user._id }, update, { new: true, runValidators: true });
    if (!lead) return res.status(404).json({ success: false, message: "Lead nahi mili" });
    res.json({ success: true, message: "Lead status update ho gaya", lead: leadToResponse(lead) });
  } catch (error) { next(error); }
}
