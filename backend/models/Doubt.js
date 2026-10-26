const mongoose = require('mongoose');

const doubtSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, minlength: 5, maxlength: 180 },
  description: { type: String, default: '', maxlength: 5000 },
  course: { type: String, default: '', trim: true },
  category: { type: String, enum: ['academic', 'nonacademic'], default: 'academic' },
  tags: [{ type: String, trim: true }],
  urgency: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['open', 'claimed', 'resolved'], default: 'open', index: true },
  claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  views: { type: Number, default: 0 },
  ratingGiven: { type: Number, min: 1, max: 5, default: null },
  ratingBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

doubtSchema.set('toJSON', {
  transform: (_doc, ret) => { ret.id = ret._id.toString(); delete ret._id; delete ret.__v; return ret; }
});

module.exports = mongoose.model('Doubt', doubtSchema);
