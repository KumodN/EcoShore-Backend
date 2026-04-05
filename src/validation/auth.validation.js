const Joi = require('joi');
const { ROLES } = require('../constants/roles');

exports.registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().optional(),
  address: Joi.string().optional(),
  phone: Joi.string().optional(),
  role: Joi.string()
    .valid('admin', 'collector', 'organizer', 'volunteer')
    .optional(),
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

exports.changePasswordSchema = Joi.object({
  body: Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
  }),
});
