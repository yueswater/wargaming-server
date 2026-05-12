const { changePassword } = require('../services/auth.service');
const { listUsers } = require('../models/user.model');
const { isUserOnline } = require('../socket/presence');

exports.me = (req, res) => {
  res.json({ user: req.user });
};

exports.changePassword = async (req, res) => {
  try {
    const user = await changePassword(req.user.id, req.body);
    return res.json({ user });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

exports.rolePresence = async (_req, res) => {
  try {
    const users = await listUsers();
    const roleUsers = users
      .filter((user) => user.gameRole)
      .map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        gameRole: user.gameRole,
        online: isUserOnline(user.id),
      }));

    return res.json({
      roleUsers,
      allOnline: roleUsers.length === 4 && roleUsers.every((user) => user.online),
    });
  } catch (err) {
    return res.status(500).json({ error: '無法取得角色在線狀態' });
  }
};
