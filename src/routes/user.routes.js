const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/me', requireAuth, ctrl.me);
router.get('/role-presence', requireAuth, ctrl.rolePresence);
router.post('/change-password', requireAuth, ctrl.changePassword);

module.exports = router;
