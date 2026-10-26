const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  username: { type: String, required: true, trim: true, lowercase: true, minlength: 3, maxlength: 30, unique: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  university: { type: String, default: '' },
  campus: { type: String, default: '' },
  year: { type: String, default: '' },
  branch: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 500 },
  academicSkills: [{ type: String }],
  nonAcademicSkills: [{ type: String }],
  reputationScore: { type: Number, default: 50, min: 0, max: 100 },
  leaderboardPoints: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0, min: 0 },
  avatar: { type: String, default: '' }
}, { timestamps: true });

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
