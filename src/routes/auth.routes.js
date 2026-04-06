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
  changePasswordSchema,
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
router.get('/users', auth(), authController.getAllUsers);

router.get(
  '/users/all',
  auth(),
  authorizeRoles(ROLES.ADMIN),
  authController.getAllUsers
);

// Activate user - admin only
router.put(
  '/users/:userId/activate',
  auth(),
  authorizeRoles(ROLES.ADMIN),
  authController.activateUser
);

// Deactivate user - admin only
router.put(
  '/users/:userId/deactivate',
  auth(),
  authorizeRoles(ROLES.ADMIN),
  authController.deactivateUser
);

// Delete user (hard delete) - admin only
router.delete(
  '/users/:userId/delete',
  auth(),
  authorizeRoles(ROLES.ADMIN),
  authController.deleteUser
);

// Profile
router.patch(
  '/profile/password',
  auth(),
  validate(changePasswordSchema),
  authController.changePassword
);
router.delete('/profile', auth(), authController.deleteAccount);

module.exports = router;
