const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  doubt: { type: mongoose.Schema.Types.ObjectId, ref: 'Doubt', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, minlength: 1, maxlength: 5000 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isBestAnswer: { type: Boolean, default: false }
}, { timestamps: true });

replySchema.set('toJSON', {
  transform: (_doc, ret) => { ret.id = ret._id.toString(); delete ret._id; delete ret.__v; return ret; }
});

module.exports = mongoose.model('Reply', replySchema);
