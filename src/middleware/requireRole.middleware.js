function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '尚未登入' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: '權限不足' });
    }

    return next();
  };
}

module.exports = {
  requireRole,
};
