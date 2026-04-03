const mongoose = require('mongoose');

const ChatGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'GLOBAL_VOLUNTEER',
        'ORGANIZER_PRIVATE',
        'EVENT_GROUP',
        'DIRECT_MESSAGE',
      ],
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      // Only set for EVENT_GROUP type
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes for performance
ChatGroupSchema.index({ type: 1 });
ChatGroupSchema.index({ members: 1 });
ChatGroupSchema.index({ eventId: 1 });
ChatGroupSchema.index({ isActive: 1 });

// Virtual for message count (can be implemented later)
ChatGroupSchema.virtual('messageCount', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'chatGroupId',
  count: true,
});

module.exports = mongoose.model('ChatGroup', ChatGroupSchema);
