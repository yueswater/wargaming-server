const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/requireRole.middleware');
const ctrl = require('../controllers/params.controller');

router.get('/', ctrl.get);
router.put('/', requireAuth, requireRole('admin'), ctrl.update);

module.exports = router;
