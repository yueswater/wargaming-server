const router = require('express').Router();
const ctrl = require('../controllers/simulation.controller');

router.post('/calculate', ctrl.calculate);
router.post('/monte-carlo', ctrl.monteCarlo);
router.get('/rules', ctrl.getRules);

module.exports = router;
