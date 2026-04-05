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
    if (err.message === 'ACCOUNT_DEACTIVATED') {
      return res
        .status(403)
        .json({ error: 'Your account has been deactivated. Contact admin.' });
    }
    if (err.message === 'ACCOUNT_DELETED') {
      return res
        .status(403)
        .json({ error: 'Your account has been deleted. Contact admin.' });
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

const activateUser = async (req, res) => {
  try {
    const User = require('../models/User');
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    user.isActive = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User activated successfully',
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    logger.error('Failed to activate user', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to activate user',
    });
  }
};

const deactivateUser = async (req, res) => {
  try {
    const User = require('../models/User');
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    user.isActive = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    logger.error('Failed to deactivate user', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to deactivate user',
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const User = require('../models/User');
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    user.isDeleted = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        isDeleted: user.isDeleted,
      },
    });
  } catch (err) {
    logger.error('Failed to delete user', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user',
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, oldPassword, newPassword);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    logger.error('Failed to change password', err);
    if (err.message === 'NO_PASSWORD_SET') return res.status(400).json({ success: false, error: 'OAuth users cannot change password' });
    if (err.message === 'INVALID_OLD_PASSWORD') return res.status(400).json({ success: false, error: 'Incorrect old password' });
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const result = await authService.deleteAccount(req.user.id);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    logger.error('Failed to delete account', err);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

module.exports = {
  register,
  login,
  googleCallback,
  getMe,
  getAllUsers,
  activateUser,
  deactivateUser,
  deleteUser,
  changePassword,
  deleteAccount,
};
