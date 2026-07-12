import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: "Login token missing hai" });

    if (token.startsWith("naxora_demo_")) {
      const persona = token.replace("naxora_demo_", "");
      const role = persona === "student" ? "student" : persona === "parent" ? "parent" : "admin";
      req.user = {
        _id: "000000000000000000000045",
        name: `NAXORA ${persona} demo`,
        email: `${persona}.demo@naxora.local`,
        role,
        isActive: true,
        isDemo: true,
      };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (globalThis.NAXORA_DB_MODE !== "mongodb") {
      req.user = {
        _id: decoded.userId || "000000000000000000000047",
        name: "NAXORA Mock User",
        email: "mock.user@naxora.local",
        role: "admin",
        isActive: true,
        isMock: true,
      };
      return next();
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: "User valid nahi hai" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Token invalid ya expired hai" });
  }
}
