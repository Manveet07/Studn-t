const Notification = require('../models/Notification');

exports.listMine = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ notifications: notifications.map(n => ({ ...n, id: n._id.toString(), _id: undefined })) });
  } catch (error) { next(error); }
};

exports.markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id }, { $set: { read: true } }, { new: true, runValidators: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    res.json({ notification });
  } catch (error) { next(error); }
};

exports.markAllRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany({ recipient: req.user._id, read: false }, { $set: { read: true } });
    res.json({ message: 'Notifications marked as read.', modifiedCount: result.modifiedCount });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const { recipientId, type, message, link = '', relatedDoubt = null } = req.body;
    if (!recipientId || !type || !String(message || '').trim()) return res.status(400).json({ message: 'recipientId, type and message are required.' });
    if (String(recipientId) === String(req.user._id)) return res.status(400).json({ message: 'You cannot notify yourself.' });
    const Notification = require('../models/Notification');
    const notification = await Notification.create({ recipient: recipientId, actor: req.user._id, type: String(type).slice(0, 60), message: String(message).trim().slice(0, 500), link: String(link).slice(0, 300), relatedDoubt });
    res.status(201).json({ notification });
  } catch (error) { next(error); }
};
