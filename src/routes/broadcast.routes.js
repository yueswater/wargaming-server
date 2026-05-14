const router = require('express').Router();
const ctrl = require('../controllers/broadcast.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

router.get('/', ctrl.list);

module.exports = router;
