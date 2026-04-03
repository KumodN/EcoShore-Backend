const express = require('express');
const passport = require('passport');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorizeRoles');
const authController = require('../controller/auth.controller');
const { ROLES } = require('../constants/roles');
const {
  registerSchema,
  loginSchema,
} = require('../validation/auth.validation');

const router = express.Router();

// Register
router.post('/register', validate(registerSchema), authController.register);

// Login
router.post('/login', validate(loginSchema), authController.login);

// Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/login',
  }),
  authController.googleCallback
);

// Current user
router.get('/me', auth(), authController.getMe);

// Get all users (admin only)
router.get('/users/all', auth(), authorizeRoles(ROLES.ADMIN), authController.getAllUsers);

module.exports = router;
