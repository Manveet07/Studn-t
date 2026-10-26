const express = require('express');
const requireAuth = require('../middleware/auth');
const controller = require('../controllers/replyController');
const router = express.Router();
router.post('/:id/vote', requireAuth, controller.vote);
router.post('/:id/best-answer', requireAuth, controller.markBestAnswer);
module.exports = router;
