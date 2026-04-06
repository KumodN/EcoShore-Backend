const Joi = require('joi');
const { PLASTIC_TYPES } = require('../constants/analytics.constants');

const agentValidation = {
  // Admin registers a new beach agent
  registerAgent: {
    body: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string(),
      name: Joi.string().trim().min(2).max(100).required(),
      nic: Joi.string().trim().min(5).max(20).required(),
      assignedBeach: Joi.string().hex().length(24).required(),
    }),
  },

  // Agent ID path param
  agentId: {
    params: Joi.object({
      agentId: Joi.string().hex().length(24).required(),
    }),
  },

  // Admin reassigns agent to a different beach
  reassignAgent: {
    params: Joi.object({
      agentId: Joi.string().hex().length(24).required(),
      beachId: Joi.string().hex().length(24).required(),
    }),
  },

  // Agent portal: submit a waste record
  // beachId is intentionally absent — injected from JWT in service layer
  agentCreateWasteRecord: {
    body: Joi.object({
      plasticType: Joi.string()
        .valid(...Object.keys(PLASTIC_TYPES))
        .required(),
      weight: Joi.number().min(0.01).max(10000).required(),
      source: Joi.string()
        .valid('CLEANUP_EVENT', 'INDIVIDUAL', 'COMMUNITY_DRIVE', 'CORPORATE')
        .default('CLEANUP_EVENT'),
      weather: Joi.object({
        condition: Joi.string().valid(
          'SUNNY',
          'CLOUDY',
          'RAINY',
          'WINDY',
          'OTHER'
        ),
        temperature: Joi.number(),
        windSpeed: Joi.number(),
      }),
      collectionDate: Joi.date().max('now').default(Date.now),
      notes: Joi.string().max(300).trim(),
    }),
  },

  // Agent portal: query params for listing own submissions
  getMySubmissions: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
    }),
  },
};

module.exports = agentValidation;
