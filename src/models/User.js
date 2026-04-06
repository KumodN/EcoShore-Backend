const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../constants/roles');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    nic: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    address: { type: String },
    phone: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    role: {
      type: String,
      enum: [ROLES.VOLUNTEER, ROLES.ORGANIZER, ROLES.ADMIN, ROLES.AGENT],
      default: ROLES.VOLUNTEER,
    },
    assignedBeach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beach',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for performance (email index already created by unique: true)
UserSchema.index({ role: 1 });
UserSchema.index({ isDeleted: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ isOnline: 1 });
UserSchema.index({ lastSeen: -1 });

module.exports = mongoose.model('User', UserSchema);
