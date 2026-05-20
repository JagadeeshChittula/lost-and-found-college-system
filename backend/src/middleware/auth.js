const User = require("../models/User");

async function currentUser(req) {
  if (!req.session.userId) return null;
  return User.findById(req.session.userId);
}

function requireLogin(req, res, next) {
  currentUser(req).then((user) => {
    if (!user) return res.status(401).json({ error: "login_required" });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  currentUser(req).then((user) => {
    if (!user || !user.isAdmin) return res.status(403).json({ error: "forbidden" });
    req.user = user;
    next();
  });
}

module.exports = { currentUser, requireLogin, requireAdmin };
