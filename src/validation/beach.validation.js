const Joi = require('joi');

const beachValidation = {
  // Create beach validation
  createBeach: {
    body: Joi.object({
      name: Joi.string().required().max(100).trim(),
      location: Joi.object({
        address: Joi.string().required().trim(),
        city: Joi.string().required().trim(),
        country: Joi.string().trim().default('Sri Lanka'),
        coordinates: Joi.object({
          type: Joi.string().valid('Point').default('Point'),
          coordinates: Joi.array().items(Joi.number()).length(2),
        }),
      }).required(),
      description: Joi.string().max(500).trim(),
      image: Joi.string().required(),
    }),
  },

  // Update beach validation
  updateBeach: {
    body: Joi.object({
      name: Joi.string().max(100).trim(),
      location: Joi.object({
        address: Joi.string().trim(),
        city: Joi.string().trim(),
        country: Joi.string().trim(),
        coordinates: Joi.object({
          type: Joi.string().valid('Point'),
          coordinates: Joi.array().items(Joi.number()).length(2),
        }),
      }),
      description: Joi.string().max(500).trim(),
      isActive: Joi.boolean(),
    }),
  },

  // Query parameters validation
  getBeaches: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      city: Joi.string().trim(),
      sortBy: Joi.string()
        .valid('name', 'createdAt', 'updatedAt', 'analytics.severityScore')
        .default('createdAt'),
      order: Joi.string().valid('asc', 'desc').default('desc'),
      isActive: Joi.boolean().default(true),
    }),
  },

  // ID parameter validation
  beachId: {
    params: Joi.object({
      beachId: Joi.string().hex().length(24).required(),
    }),
  },

  // Severity ranking validation
  severityRanking: {
    query: Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(10),
    }),
  },
};

module.exports = beachValidation;
