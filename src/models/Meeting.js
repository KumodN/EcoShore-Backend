const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    scheduledAt: {
      type: Date,
      default: null,
    },
    isInstant: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'ended'],
      default: 'scheduled',
    },
  },
  { timestamps: true }
);

MeetingSchema.path('participants').validate(function validateMaxParticipants(
  participants
) {
  return participants.length <= 5;
}, 'Meeting cannot have more than 5 participants');

MeetingSchema.index({ createdBy: 1 });
MeetingSchema.index({ participants: 1 });
MeetingSchema.index({ status: 1 });
MeetingSchema.index({ scheduledAt: 1 });

module.exports = mongoose.model('Meeting', MeetingSchema);
