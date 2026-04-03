const authService = require('../service/auth.service');
const { generateToken } = require('../config/jwt');
const logger = require('../config/logger');

const register = async (req, res) => {
  try {
    const result = await authService.registerUser(req.body);
    return res.status(201).json(result);
  } catch (err) {
    logger.error('User registration failed', err);
    if (err.message === 'USER_EXISTS') {
      return res.status(400).json({ error: 'User already exists' });
    }
    return res.status(500).json({ error: 'Server Error' });
  }
};

const login = async (req, res) => {
  try {
    const result = await authService.loginUser(req.body);
    return res.status(200).json(result);
  } catch (err) {
    logger.error('User login failed', err);
    if (err.message === 'INVALID_CREDENTIALS') {
      return res.status(400).json({ error: 'Invalid Credentials' });
    }
    return res.status(500).json({ error: 'Server Error' });
  }
};

const googleCallback = (req, res) => {
  const user = req.user;
  const token = generateToken(user);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendUrl}/login?token=${token}`);
};

const getMe = async (req, res) => {
  const User = require('../models/User');
  const user = await User.findById(req.user.id).select('-password');
  res.json({ user, token: req.token });
};

const getAllUsers = async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find({ isDeleted: false })
      .select('-password')
      .populate('assignedBeach', 'name location')
      .lean();
    
    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    logger.error('Failed to fetch all users', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
    });
  }
};

module.exports = {
  register,
  login,
  googleCallback,
  getMe,
  getAllUsers,
};
