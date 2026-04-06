const mongoose = require('mongoose');
const beachSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Beach name is required'],
      trim: true,
      maxlength: [100, 'Beach name cannot exceed 100 characters'],
      index: true,
    },

    image: {
      type: String,
      default: 'https://placehold.co/300X200?text=No+Image+Found',
      trim: true,
    },

    location: {
      address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
        index: true,
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true,
        default: 'Sri Lanka',
        index: true,
      },
      // GeoJSON Point for spatial queries
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          required: false,
          validate: {
            validator: function (v) {
              return !v || (Array.isArray(v) && v.length === 2);
            },
            message: 'Coordinates must be an array of [longitude, latitude]',
          },
        },
      },
    },

    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    // Denormalized fields for analytics performance
    analytics: {
      totalWasteCollected: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalCleanups: {
        type: Number,
        default: 0,
        min: 0,
      },
      lastCleanupDate: {
        type: Date,
      },
      severityScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      severityLevel: {
        type: String,
        enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
        default: 'LOW',
      },
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    assignedAgents: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
      validate: {
        validator: function (v) {
          return !v || v.length <= 2;
        },
        message: 'Maximum 2 agents can be assigned to a beach',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ==========================================
// INDEXES - Optimized for analytics queries
// ==========================================

// GeoJSON index for location-based queries
beachSchema.index({ 'location.coordinates': '2dsphere' });

// Compound index for dashboard queries
beachSchema.index({
  'analytics.severityScore': -1,
  'analytics.totalWasteCollected': -1,
});

// Index for filtering active beaches by city
beachSchema.index({
  isActive: 1,
  'location.city': 1,
  'analytics.severityScore': -1,
});

// ==========================================
// VIRTUALS
// ==========================================

// Virtual populate for waste records
beachSchema.virtual('wasteRecords', {
  ref: 'WasteRecord',
  localField: '_id',
  foreignField: 'beachId',
});

// ==========================================
// INSTANCE METHODS
// ==========================================

beachSchema.methods.updateAnalytics = async function (wasteRecord) {
  this.analytics.totalWasteCollected += wasteRecord.weight;
  this.analytics.totalCleanups += 1;
  this.analytics.lastCleanupDate = new Date();

  await this.save();
  return this;
};

/**
 * Calculate severity level based on score
 */
beachSchema.methods.calculateSeverityLevel = function () {
  const score = this.analytics.severityScore;

  if (score >= 75) this.analytics.severityLevel = 'CRITICAL';
  else if (score >= 50) this.analytics.severityLevel = 'HIGH';
  else if (score >= 25) this.analytics.severityLevel = 'MODERATE';
  else this.analytics.severityLevel = 'LOW';

  return this.analytics.severityLevel;
};

module.exports = mongoose.model('Beach', beachSchema);
