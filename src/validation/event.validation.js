const Joi = require('joi');

const eventValidation = {
  // Create event validation
  createEvent: {
    body: {
      title: Joi.string().required().max(200).messages({
        'string.empty': 'Event title is required',
        'string.max': 'Title cannot exceed 200 characters',
      }),
      description: Joi.string().required().max(2000).messages({
        'string.empty': 'Event description is required',
        'string.max': 'Description cannot exceed 2000 characters',
      }),
      beachId: Joi.string().required().messages({
        'string.empty': 'Beach Id is required',
      }),
      startDate: Joi.date().iso().greater('now').required().messages({
        'date.base': 'Start date must be a valid date',
        'date.greater': 'Start date must be in the future',
      }),
      endDate: Joi.date()
        .iso()
        .greater(Joi.ref('startDate'))
        .required()
        .messages({
          'date.greater': 'End date must be after start date',
        }),
      maxVolunteers: Joi.number().min(1).optional().allow(null),
      tags: Joi.array().items(Joi.string().max(50)).optional(),
      imageUrls: Joi.array().items(Joi.string().uri()).optional(),
    },
  },

  // Update event validation
  updateEvent: {
    body: {
      title: Joi.string().required().max(200).messages({
        'string.empty': 'Event title is required',
        'string.max': 'Title cannot exceed 200 characters',
      }),
      description: Joi.string().required().max(2000).messages({
        'string.empty': 'Event description is required',
        'string.max': 'Description cannot exceed 2000 characters',
      }),
      beachId: Joi.string().required().messages({
        'string.empty': 'Beach Id is required',
      }),
      startDate: Joi.date().iso().greater('now').required().messages({
        'date.base': 'Start date must be a valid date',
        'date.greater': 'Start date must be in the future',
      }),
      endDate: Joi.date()
        .iso()
        .greater(Joi.ref('startDate'))
        .required()
        .messages({
          'date.greater': 'End date must be after start date',
        }),
      maxVolunteers: Joi.number().min(1).optional().allow(null),
      tags: Joi.array().items(Joi.string().max(50)).optional(),
      imageUrls: Joi.array().items(Joi.string().uri()).optional(),
    },
  },

  // Delete event validation
  deleteEvent: {
    query: {
      eventId: Joi.string().optional(),
    },
  },
};

module.exports = eventValidation;
