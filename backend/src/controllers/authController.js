import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";


const demoUsers = {
  "owner.demo@naxora.local": { id: "demo-owner", name: "NAXORA Demo Owner", email: "owner.demo@naxora.local", role: "admin", instituteName: "NAXORA Demo Institute", avatar: "" },
  "student.demo@naxora.local": { id: "demo-student", name: "Aman Student", email: "student.demo@naxora.local", role: "student", instituteName: "NAXORA Demo Institute", avatar: "" },
  "parent.demo@naxora.local": { id: "demo-parent", name: "Parent Demo User", email: "parent.demo@naxora.local", role: "parent", instituteName: "NAXORA Demo Institute", avatar: "" },
  "superadmin.demo@naxora.local": { id: "demo-super-admin", name: "NAXORA Super Admin", email: "superadmin.demo@naxora.local", role: "admin", instituteName: "NAXORA SaaS HQ", avatar: "" }
};

const isDbReady = () => globalThis.NAXORA_DB_MODE === "mongodb";
const mockAuthResponse = (email, role = "student", name = "NAXORA Demo User") => {
  const normalizedEmail = String(email || "student.demo@naxora.local").toLowerCase().trim();
  const user = demoUsers[normalizedEmail] || {
    id: `mock-${role}-${Date.now()}`,
    name,
    email: normalizedEmail,
    role: ["student", "teacher", "parent", "admin"].includes(role) ? role : "student",
    instituteName: "NAXORA Mock Institute",
    avatar: ""
  };
  return {
    success: true,
    mode: "mock",
    message: "MongoDB connect nahi hai, isliye Part 47 safe demo/mock login active hai. Real data ke liye Atlas connection fix karo.",
    token: `naxora_demo_${user.role === "parent" ? "parent" : user.role === "student" ? "student" : "owner"}`,
    user
  };
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  instituteName: user.instituteName,
});

export async function signup(req, res, next) {
  try {
    const { name, email, password, role = "student" } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email aur password required hain" });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password minimum 8 characters ka ho" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!isDbReady()) {
      return res.status(201).json(mockAuthResponse(normalizedEmail, role, name));
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ success: false, message: "Email already registered hai" });

    // Public signup se admin banana blocked hai.
    const safeRole = ["student", "teacher", "parent"].includes(role) ? role : "student";
    const user = await User.create({ name, email: normalizedEmail, password, role: safeRole });
    res.status(201).json({ success: true, token: generateToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email aur password required hain" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!isDbReady()) {
      return res.json(mockAuthResponse(normalizedEmail, "admin", "NAXORA Demo User"));
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Email ya password galat hai" });
    }
    if (!user.isActive) return res.status(403).json({ success: false, message: "Account disabled hai" });

    res.json({ success: true, token: generateToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res) {
  res.json({ success: true, user: publicUser(req.user) });
}
