const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    beachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beach',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    volunteers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    maxVolunteers: {
      type: Number,
      default: null, // null = unlimited
    },
    status: {
      type: String,
      enum: ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'],
      default: 'UPCOMING',
    },
    chatGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatGroup',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    imageUrls: [
      {
        type: String,
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for performance
EventSchema.index({ organizerId: 1 });
EventSchema.index({ agentId: 1 });
EventSchema.index({ status: 1 });
EventSchema.index({ startDate: 1 });
EventSchema.index({ isDeleted: 1 });
EventSchema.index({ volunteers: 1 });

// Compound index for finding active events
EventSchema.index({ status: 1, isDeleted: 1, startDate: 1 });

module.exports = mongoose.model('Event', EventSchema);
