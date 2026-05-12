const router = require('express').Router();
const ctrl = require('../controllers/scenario.controller');

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);

module.exports = router;
