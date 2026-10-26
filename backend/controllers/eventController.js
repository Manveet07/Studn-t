const ContributionEvent = require('../models/ContributionEvent');
const POINTS = { claim: 5, resolve: 10, best_answer: 15, reply_liked: 1, reply_disliked: -1 };
exports.listMine = async (req, res, next) => {
  try { const events = await ContributionEvent.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100); res.json({ events }); }
  catch (error) { next(error); }
};
exports.create = async (req, res, next) => {
  try {
    const { action, doubtId, replyId, metadata = {} } = req.body;
    if (!Object.hasOwn(POINTS, action)) return res.status(400).json({ message: 'Unsupported contribution action.' });
    const event = await ContributionEvent.create({ user: req.user._id, action, points: POINTS[action], doubt: doubtId || null, reply: replyId || null, metadata });
    req.user.leaderboardPoints += event.points;
    req.user.reputationScore = Math.max(0, Math.min(100, req.user.reputationScore + event.points));
    await req.user.save();
    res.status(201).json({ event, user: req.user });
  } catch (error) { next(error); }
};
