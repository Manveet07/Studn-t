const mongoose = require('mongoose');

const contributionEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, enum: ['claim', 'resolve', 'best_answer', 'reply_liked', 'reply_disliked'], required: true },
  points: { type: Number, required: true },
  doubt: { type: mongoose.Schema.Types.ObjectId, ref: 'Doubt', default: null },
  reply: { type: mongoose.Schema.Types.ObjectId, ref: 'Reply', default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('ContributionEvent', contributionEventSchema);
