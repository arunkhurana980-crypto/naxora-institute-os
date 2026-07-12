export function allowRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Login required hai" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Aapko is action ki permission nahi hai",
      });
    }

    next();
  };
}
