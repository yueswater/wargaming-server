const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/game.controller');

router.use(requireAuth);

router.post('/start', ctrl.start);
router.get('/active', ctrl.getActive);
router.get('/:id', ctrl.get);
router.post('/:id/rounds/:roundNumber/submissions', ctrl.submit);

module.exports = router;
