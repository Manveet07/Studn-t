const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true, maxlength: 60 },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  link: { type: String, default: '' },
  read: { type: Boolean, default: false, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  relatedDoubt: { type: mongoose.Schema.Types.ObjectId, ref: 'Doubt', default: null }
}, { timestamps: true });
notificationSchema.set('toJSON', { transform: (_doc, ret) => { ret.id = ret._id.toString(); delete ret._id; delete ret.__v; return ret; } });
module.exports = mongoose.model('Notification', notificationSchema);
