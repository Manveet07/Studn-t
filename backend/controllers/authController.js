const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function makeToken(user) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing.');
  return jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

exports.register = async (req, res, next) => {
  try {
    const { name, username, email, password, university, campus, year, branch, bio, academicSkills, nonAcademicSkills } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'Name, username, email and password are required.' });
    }
    if (String(password).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    const normalizedUsername = String(username).trim().toLowerCase();
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ $or: [{ username: normalizedUsername }, { email: normalizedEmail }] });
    if (existing) return res.status(409).json({ message: 'That username or email is already registered.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name, username: normalizedUsername, email: normalizedEmail, passwordHash,
      university, campus, year, branch, bio,
      academicSkills: Array.isArray(academicSkills) ? academicSkills : [],
      nonAcademicSkills: Array.isArray(nonAcademicSkills) ? nonAcademicSkills : []
    });
    return res.status(201).json({ message: 'Account created.', token: makeToken(user), user });
  } catch (error) { next(error); }
};

exports.login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ message: 'Username/email and password are required.' });
    const key = String(identifier).trim().toLowerCase();
    const user = await User.findOne({ $or: [{ username: key }, { email: key }] }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid username/email or password.' });
    }
    return res.json({ message: 'Login successful.', token: makeToken(user), user });
  } catch (error) { next(error); }
};

exports.me = (req, res) => res.json({ user: req.user });
