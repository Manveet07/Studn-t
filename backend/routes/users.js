const express = require('express');
const requireAuth = require('../middleware/auth');
const controller = require('../controllers/userController');
const router = express.Router();
router.get('/me', requireAuth, controller.me);
router.patch('/me', requireAuth, controller.updateMe);
router.get('/leaderboard', controller.leaderboard);
router.get('/:id', controller.getById);
module.exports = router;
