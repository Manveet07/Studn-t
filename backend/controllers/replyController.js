
const Reply = require('../models/Reply');
const ContributionEvent = require('../models/ContributionEvent');
const User = require('../models/User');

const VOTE_POINTS = {
  like: 1,
  dislike: -1
};

// Apply points to a user's leaderboard and reputation
async function updateUserPoints(userId, points) {
  const user = await User.findById(userId);

  if (!user) return;

  user.leaderboardPoints =
    (user.leaderboardPoints || 0) + points;

  user.reputationScore = Math.max(
    0,
    Math.min(100, (user.reputationScore || 0) + points)
  );

  await user.save();
}

// Create a contribution event and update the author's score
async function recordVoteContribution(reply, action, points, voterId) {
  const event = await ContributionEvent.create({
    user: reply.author,
    action,
    points,
    doubt: reply.doubt,
    reply: reply._id,
    metadata: { voterId: voterId.toString() }
  });

  await updateUserPoints(reply.author, points);

  return event;
}

// Vote on a reply
exports.vote = async (req, res, next) => {
  try {
    const { vote } = req.body;

    if (!['like', 'dislike'].includes(vote)) {
      return res.status(400).json({
        message: 'vote must be like or dislike.'
      });
    }

    const reply = await Reply.findById(req.params.id);

    if (!reply) {
      return res.status(404).json({
        message: 'Reply not found.'
      });
    }

    const userId = req.user._id;

    if (reply.author.toString() === userId.toString()) {
      return res.status(403).json({
        message: 'You cannot vote on your own reply.'
      });
    }

    const target = vote === 'like'
      ? reply.likes
      : reply.dislikes;

    const opposite = vote === 'like'
      ? reply.dislikes
      : reply.likes;

    const targetIndex = target.findIndex(
      id => id.toString() === userId.toString()
    );

    const oppositeIndex = opposite.findIndex(
      id => id.toString() === userId.toString()
    );

    let pointsChange = 0;
    let action = null;

    if (targetIndex >= 0) {
      // Remove the existing vote and reverse its contribution
      target.splice(targetIndex, 1);
      pointsChange = -VOTE_POINTS[vote];
    } else {
      // If switching vote, reverse the old vote first
      if (oppositeIndex >= 0) {
        opposite.splice(oppositeIndex, 1);
        const oldVote = vote === 'like' ? 'dislike' : 'like';
        pointsChange -= VOTE_POINTS[oldVote];
      }

      target.push(userId);
      pointsChange += VOTE_POINTS[vote];
      action = vote === 'like'
        ? 'reply_liked'
        : 'reply_disliked';
    }

    await reply.save();

    let event = null;

    if (pointsChange !== 0) {
      event = await recordVoteContribution(
        reply,
        action || (vote === 'like' ? 'reply_liked' : 'reply_disliked'),
        pointsChange,
        userId
      );
    }

    res.json({
      message: 'Vote updated successfully.',
      reply,
      voteAdded: targetIndex < 0,
      pointsChange,
      event
    });
  } catch (error) {
    next(error);
  }
};


// Mark a reply as the best answer
exports.markBestAnswer = async (req, res, next) => {
  try {
    const reply = await Reply.findById(req.params.id)
      .populate('doubt');

    if (!reply) {
      return res.status(404).json({
        message: 'Reply not found.'
      });
    }

    if (!reply.doubt) {
      return res.status(404).json({
        message: 'Associated doubt not found.'
      });
    }

    if (
      reply.doubt.author.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message: 'Only the doubt author can choose the best answer.'
      });
    }

    if (reply.isBestAnswer) {
      return res.json({
        message: 'This reply is already the best answer.',
        reply
      });
    }

    const previousBest = await Reply.findOne({
      doubt: reply.doubt._id,
      isBestAnswer: true
    });

    if (previousBest) {
      return res.status(409).json({
        message: 'A best answer has already been selected for this doubt.'
      });
    }

    reply.isBestAnswer = true;
    await reply.save();

    const points = 15;

    const event = await ContributionEvent.create({
      user: reply.author,
      action: 'best_answer',
      points,
      doubt: reply.doubt._id,
      reply: reply._id
    });

    await updateUserPoints(reply.author, points);

    res.json({
      message: 'Best answer selected successfully.',
      reply,
      event
    });
  } catch (error) {
    next(error);
  }
};
