
const Doubt = require('../models/Doubt');
const Reply = require('../models/Reply');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const ContributionEvent = require('../models/ContributionEvent');

// Helper: create a contribution event and update user scores
async function awardContribution({
  userId,
  action,
  points,
  doubtId
}) {
  const event = await ContributionEvent.create({
    user: userId,
    action,
    points,
    doubt: doubtId
  });

  await User.findByIdAndUpdate(userId, {
    $inc: { leaderboardPoints: points },
    $max: { reputationScore: 0 }
  });

  const user = await User.findById(userId);

  if (user) {
    user.reputationScore = Math.max(
      0,
      Math.min(100, (user.reputationScore || 0) + points)
    );
    await user.save();
  }

  return event;
}

// GET doubts
exports.list = async (req, res, next) => {
  try {
    const filter = {};

    if (
      req.query.status &&
      ['open', 'claimed', 'resolved'].includes(req.query.status)
    ) {
      filter.status = req.query.status;
    }

    if (req.query.mine === 'true') {
      const auth = req.headers.authorization || '';
      const token = auth.replace(/^Bearer\s+/, '');

      if (!token) {
        return res.status(401).json({
          message: 'Sign in to view your doubts.'
        });
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      filter.author = payload.userId;
    }

    const doubts = await Doubt.find(filter)
      .populate('author', 'name username avatar reputationScore')
      .populate('claimedBy', 'name username')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ doubts });
  } catch (error) {
    next(error);
  }
};

// CREATE doubt
exports.create = async (req, res, next) => {
  try {
    const {
      title,
      description,
      course,
      category,
      tags,
      urgency
    } = req.body;

    if (!title || String(title).trim().length < 5) {
      return res.status(400).json({
        message: 'Title must be at least 5 characters.'
      });
    }

    const doubt = await Doubt.create({
      author: req.user._id,
      title,
      description,
      course,
      category,
      tags,
      urgency: ['low', 'medium', 'high', 'critical'].includes(urgency)
        ? urgency
        : 'medium'
    });

    await doubt.populate(
      'author',
      'name username avatar reputationScore'
    );

    res.status(201).json({ doubt });
  } catch (error) {
    next(error);
  }
};

// GET one doubt and its replies
exports.getById = async (req, res, next) => {
  try {
    const doubt = await Doubt.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('author', 'name username avatar reputationScore')
      .populate('claimedBy', 'name username');

    if (!doubt) {
      return res.status(404).json({
        message: 'Doubt not found.'
      });
    }

    const replies = await Reply.find({ doubt: doubt._id })
      .populate('author', 'name username avatar reputationScore')
      .sort({ isBestAnswer: -1, createdAt: 1 });

    res.json({ doubt, replies });
  } catch (error) {
    next(error);
  }
};

// UPDATE doubt
exports.update = async (req, res, next) => {
  try {
    const doubt = await Doubt.findById(req.params.id);

    if (!doubt) {
      return res.status(404).json({
        message: 'Doubt not found.'
      });
    }

    if (String(doubt.author) !== String(req.user._id)) {
      return res.status(403).json({
        message: 'Only the author can edit this doubt.'
      });
    }

    for (const key of [
      'title',
      'description',
      'course',
      'category',
      'tags',
      'urgency'
    ]) {
      if (req.body[key] !== undefined) {
        doubt[key] = req.body[key];
      }
    }

    await doubt.save();
    res.json({ doubt });
  } catch (error) {
    next(error);
  }
};

// CLAIM doubt: +5 points to the helper
exports.claim = async (req, res, next) => {
  try {
    const doubt = await Doubt.findById(req.params.id);

    if (!doubt) {
      return res.status(404).json({
        message: 'Doubt not found.'
      });
    }

    if (String(doubt.author) === String(req.user._id)) {
      return res.status(400).json({
        message: 'You cannot claim your own doubt.'
      });
    }

    if (doubt.status !== 'open') {
      return res.status(409).json({
        message: 'This doubt is no longer open.'
      });
    }

    doubt.status = 'claimed';
    doubt.claimedBy = req.user._id;
    await doubt.save();

    const event = await awardContribution({
      userId: req.user._id,
      action: 'claim',
      points: 5,
      doubtId: doubt._id
    });

    res.json({ doubt, event });
  } catch (error) {
    next(error);
  }
};

// ADD reply
exports.addReply = async (req, res, next) => {
  try {
    const doubt = await Doubt.findById(req.params.id);

    if (!doubt) {
      return res.status(404).json({
        message: 'Doubt not found.'
      });
    }

    const text = String(req.body.text || '').trim();

    if (!text) {
      return res.status(400).json({
        message: 'Reply text is required.'
      });
    }

    const reply = await Reply.create({
      doubt: doubt._id,
      author: req.user._id,
      text
    });

    await reply.populate(
      'author',
      'name username avatar reputationScore'
    );

    res.status(201).json({ reply });
  } catch (error) {
    next(error);
  }
};

// RESOLVE doubt: +10 points to the assigned helper
exports.resolve = async (req, res, next) => {
  try {
    const doubt = await Doubt.findById(req.params.id);

    if (!doubt) {
      return res.status(404).json({
        message: 'Doubt not found.'
      });
    }

    if (String(doubt.author) !== String(req.user._id)) {
      return res.status(403).json({
        message: 'Only the author can resolve this doubt.'
      });
    }

    if (doubt.status === 'resolved') {
      return res.status(409).json({
        message: 'This doubt is already resolved.'
      });
    }

    if (!doubt.claimedBy) {
      return res.status(409).json({
        message: 'This doubt has no assigned helper.'
      });
    }

    doubt.status = 'resolved';
    await doubt.save();

    const event = await awardContribution({
      userId: doubt.claimedBy,
      action: 'resolve',
      points: 10,
      doubtId: doubt._id
    });

    res.json({ doubt, event });
  } catch (error) {
    next(error);
  }
};

// RATE helper
exports.rateHelper = async (req, res, next) => {
  try {
    const rating = Number(req.body.rating);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: 'Rating must be an integer from 1 to 5.'
      });
    }

    const doubt = await Doubt.findById(req.params.id);

    if (!doubt) {
      return res.status(404).json({
        message: 'Doubt not found.'
      });
    }

    if (String(doubt.author) !== String(req.user._id)) {
      return res.status(403).json({
        message: 'Only the doubt author can rate the helper.'
      });
    }

    if (!doubt.claimedBy) {
      return res.status(409).json({
        message: 'This doubt has no assigned helper to rate.'
      });
    }

    if (String(doubt.claimedBy) === String(req.user._id)) {
      return res.status(400).json({
        message: 'You cannot rate yourself.'
      });
    }

    if (doubt.ratingGiven !== undefined && doubt.ratingGiven !== null) {
      return res.status(409).json({
        message: 'This doubt has already been rated.'
      });
    }

    const helper = await User.findById(doubt.claimedBy);

    if (!helper) {
      return res.status(404).json({
        message: 'Helper not found.'
      });
    }

    doubt.ratingGiven = rating;
    doubt.ratingBy = req.user._id;
    await doubt.save();

    const previousCount = Number(helper.ratingCount || 0);
    const previousAverage = Number(helper.averageRating || 0);

    helper.ratingCount = previousCount + 1;
    helper.averageRating = Number(
      (
        (previousAverage * previousCount + rating) /
        helper.ratingCount
      ).toFixed(2)
    );

    await helper.save();

    res.json({
      message: 'Rating saved.',
      rating,
      helper: {
        id: helper.id,
        username: helper.username,
        averageRating: helper.averageRating,
        ratingCount: helper.ratingCount
      }
    });
  } catch (error) {
    next(error);
  }
};
