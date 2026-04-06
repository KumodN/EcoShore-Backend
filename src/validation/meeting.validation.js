const Joi = require('joi');

const meetingValidation = {
  createMeeting: {
    body: {
      title: Joi.string().trim().required().max(200).messages({
        'string.empty': 'Meeting title is required',
        'string.max': 'Meeting title cannot exceed 200 characters',
      }),
      participants: Joi.array()
        .items(Joi.string().required())
        .max(5)
        .required()
        .messages({
          'array.base': 'Participants must be an array',
          'array.max': 'Participants cannot exceed 5 users',
        }),
      isInstant: Joi.boolean().required(),
      scheduledAt: Joi.when('isInstant', {
        is: true,
        then: Joi.any().optional().allow(null),
        otherwise: Joi.date().iso().required().messages({
          'date.base': 'scheduledAt must be a valid date',
          'any.required': 'scheduledAt is required for scheduled meetings',
        }),
      }),
    },
  },
  meetingIdParam: {
    params: {
      id: Joi.string().required().messages({
        'string.empty': 'Meeting id is required',
      }),
    },
  },
};

module.exports = meetingValidation;
