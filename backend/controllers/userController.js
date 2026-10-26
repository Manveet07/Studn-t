const User = require('../models/User');
exports.me = (req, res) => res.json({ user: req.user });
exports.updateMe = async (req, res, next) => {
  try {
    const allowed = ['name', 'bio', 'university', 'campus', 'year', 'branch', 'academicSkills', 'nonAcademicSkills', 'avatar'];
    for (const key of allowed) if (req.body[key] !== undefined) req.user[key] = req.body[key];
    await req.user.save();
    res.json({ user: req.user });
  } catch (error) { next(error); }
};
exports.leaderboard = async (_req, res, next) => {
  try {
    const users = await User.find({}, 'name username reputationScore leaderboardPoints university campus averageRating ratingCount').sort({ leaderboardPoints: -1, reputationScore: -1 }).limit(50).lean();
    res.json({ leaderboard: users.map((u, index) => ({ ...u, id: u._id.toString(), rank: index + 1, _id: undefined })) });
  } catch (error) { next(error); }
};
exports.getById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('name username bio avatar reputationScore leaderboardPoints averageRating ratingCount university campus year branch academicSkills nonAcademicSkills createdAt');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ user });
  } catch (error) { next(error); }
};
