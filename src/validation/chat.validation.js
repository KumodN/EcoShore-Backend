const Joi = require('joi');

const createChatGroupSchema = {
  body: Joi.object({
    name: Joi.string().required().max(100).messages({
      'string.empty': 'Group name is required',
      'string.max': 'Group name cannot exceed 100 characters',
    }),
    description: Joi.string().max(500).optional(),
    type: Joi.string()
      .valid(
        'GLOBAL_VOLUNTEER',
        'ORGANIZER_PRIVATE',
        'EVENT_GROUP',
        'DIRECT_MESSAGE'
      )
      .required(),
    eventId: Joi.string().optional(),
    members: Joi.array().items(Joi.string().hex().length(24)).optional(),
  }),
};

const sendMessageSchema = {
  body: Joi.object({
    text: Joi.string().max(2000).optional(),
    mediaUrl: Joi.string().uri().optional(),
  }).or('text', 'mediaUrl'), // At least one must be present
};

const addMemberSchema = {
  body: Joi.object({
    userId: Joi.string().required().messages({
      'string.empty': 'User ID is required',
    }),
  }),
};

const promoteMemberSchema = {
  body: Joi.object({
    userId: Joi.string().required().messages({
      'string.empty': 'User ID is required',
    }),
  }),
};

module.exports = {
  createChatGroupSchema,
  sendMessageSchema,
  addMemberSchema,
  promoteMemberSchema,
};
