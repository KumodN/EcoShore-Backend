const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../config/jwt');
const chatService = require('./chat.service');
const { ROLES } = require('../constants/roles');
const logger = require('../config/logger');
const { sendAgentCredentialsEmail } = require('../config/email');
const {generateRandomSixDigit} = require('../utils/random')

const registerUser = async ({
  email,
  password,
  name,
  address,
  phone,
  role,
}) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('USER_EXISTS');
  }

  
  const hashed = await bcrypt.hash(password, 10);

  const user = new User({
    email,
    password: hashed,
    name,
    address,
    phone,
    role: role || ROLES.VOLUNTEER,
  });

  await user.save();

  // Auto-add to GLOBAL_VOLUNTEER group
  try {
    await chatService.addToGlobalVolunteerGroup(user._id.toString());
  } catch (error) {
    logger.error('Failed to add user to global volunteer group:', error);
    // Don't fail registration if chat group assignment fails
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
    },
  };
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  if (user.isDeleted) {
    throw new Error('ACCOUNT_DELETED');
  }

  if (!user.isActive) {
    throw new Error('ACCOUNT_DEACTIVATED');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
    },
  };
};

const findOrCreateGoogleUser = async (profile) => {
  const email = profile.emails?.[0]?.value;

  let user = await User.findOne({ googleId: profile.id });
  if (user) return user;

  if (email) {
    user = await User.findOne({ email });
    if (user) {
      user.googleId = profile.id;
      await user.save();
      return user;
    }
  }

  // Create new user
  user = await User.create({
    googleId: profile.id,
    email,
    name: profile.displayName,
    role: ROLES.VOLUNTEER,
  });

  // Auto-add to GLOBAL_VOLUNTEER group
  try {
    await chatService.addToGlobalVolunteerGroup(user._id.toString());
  } catch (error) {
    logger.error('Failed to add user to global volunteer group:', error);
    // Don't fail registration if chat group assignment fails
  }

  return user;
};

const registerAgent = async ({ email, password, name, nic, assignedBeach }) => {
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new Error('USER_EXISTS');
  }

  const existingNic = await User.findOne({ nic });
  if (existingNic) {
    throw new Error('NIC_EXISTS');
  }

  const Beach = require('../models/Beach');
  const beach = await Beach.findById(assignedBeach);
  if (!beach || !beach.isActive) {
    throw new Error('BEACH_NOT_FOUND');
  }

  // Check if max agents already assigned
  if (beach.assignedAgents && beach.assignedAgents.length >= 2) {
    throw new Error('BEACH_MAX_AGENTS');
  }

   const plainPassword = generateRandomSixDigit();
  const hashed = await bcrypt.hash(plainPassword, 10);

  const agent = new User({
    email,
    password: hashed,
    name,
    nic,
    assignedBeach,
    role: 'agent',
  });

  await agent.save();

  // Add agent to beach's assignedAgents
  if (!beach.assignedAgents) {
    beach.assignedAgents = [];
  }
  beach.assignedAgents.push(agent._id);
  await beach.save();

  // Send agent credentials email
  try {
    await sendAgentCredentialsEmail(email, {
      email,
      password:plainPassword, // Plain text password (only sent once)
      name,
    });
  } catch (emailError) {
    logger.error('Failed to send agent credentials email, but agent was created:', emailError);
    // Don't fail agent creation if email fails - agent is already created
  }

  return {
    agent: {
      id: agent._id,
      email: agent.email,
      name: agent.name,
      nic: agent.nic,
      assignedBeach: agent.assignedBeach,
      role: agent.role,
    },
  };
};

module.exports = {
  registerUser,
  loginUser,
  findOrCreateGoogleUser,
  registerAgent,
};
