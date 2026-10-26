const express = require('express');
const requireAuth = require('../middleware/auth');
const controller = require('../controllers/eventController');
const router = express.Router();
router.get('/me', requireAuth, controller.listMine);
router.post('/', requireAuth, controller.create);
module.exports = router;
