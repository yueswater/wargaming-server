const { createUser, getUserByUsername, updateUser } = require('../models/user.model');
const { hashPassword } = require('./password.service');

const roleAccounts = [
  {
    gameRole: 'tsmc',
    envUsername: 'ROLE_TSMC_USERNAME',
    envPassword: 'ROLE_TSMC_PASSWORD',
    envDisplayName: 'ROLE_TSMC_DISPLAY_NAME',
    fallbackDisplayName: '台積電',
  },
  {
    gameRole: 'gov',
    envUsername: 'ROLE_GOV_USERNAME',
    envPassword: 'ROLE_GOV_PASSWORD',
    envDisplayName: 'ROLE_GOV_DISPLAY_NAME',
    fallbackDisplayName: '行政院',
  },
  {
    gameRole: 'us',
    envUsername: 'ROLE_US_USERNAME',
    envPassword: 'ROLE_US_PASSWORD',
    envDisplayName: 'ROLE_US_DISPLAY_NAME',
    fallbackDisplayName: '美國政府',
  },
  {
    gameRole: 'thinktank',
    envUsername: 'ROLE_THINKTANK_USERNAME',
    envPassword: 'ROLE_THINKTANK_PASSWORD',
    envDisplayName: 'ROLE_THINKTANK_DISPLAY_NAME',
    fallbackDisplayName: '智庫',
  },
  {
    gameRole: null,
    systemRole: 'admin',
    envUsername: 'ROLE_ADMIN_USERNAME',
    envPassword: 'ROLE_ADMIN_PASSWORD',
    envDisplayName: 'ROLE_ADMIN_DISPLAY_NAME',
    fallbackDisplayName: '上帝視角',
  },
];

async function seedRoleUsers() {
  for (const account of roleAccounts) {
    const username = process.env[account.envUsername];
    const password = process.env[account.envPassword];
    const displayName = process.env[account.envDisplayName] || account.fallbackDisplayName;

    if (!username || !password) {
      throw new Error(`缺少 ${account.envUsername} 或 ${account.envPassword} 設定`);
    }

    const passwordHash = hashPassword(password);
    const existing = await getUserByUsername(username);
    const systemRole = account.systemRole || 'user';

    if (!existing) {
      await createUser({
        username,
        displayName,
        passwordHash,
        role: systemRole,
        gameRole: account.gameRole,
        status: 'active',
      });
      continue;
    }

    await updateUser(existing.id, {
      displayName,
      passwordHash,
      role: systemRole,
      gameRole: account.gameRole,
      status: 'active',
    });
  }
}

module.exports = {
  seedRoleUsers,
};
