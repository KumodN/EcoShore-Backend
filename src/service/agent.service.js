const agentRepository = require('../repository/agent.repository');
const { registerAgent } = require('./auth.service');
const { Beach } = require('../models');
const { NotFoundError } = require('../utils/AppError');

class AgentService {
  // Admin: register a new beach agent
  async createAgent(agentData) {
    return registerAgent(agentData);
  }

  // Admin: list all agents
  async getAllAgents() {
    return agentRepository.findAllAgents();
  }

  // Admin: get single agent profile
  async getAgentById(agentId) {
    const agent = await agentRepository.findAgentById(agentId);
    if (!agent) throw new NotFoundError('Agent');
    return agent;
  }

  // Admin: delete an agent (hard delete — existing waste records remain)
  async deleteAgent(agentId) {
    const agent = await agentRepository.findAgentById(agentId);
    if (!agent) throw new NotFoundError('Agent');

    // Remove agent from beach's assignedAgents
    if (agent.assignedBeach) {
      const beach = await Beach.findById(agent.assignedBeach);
      if (beach) {
        beach.assignedAgents = beach.assignedAgents.filter(
          (id) => id.toString() !== agentId
        );
        await beach.save();
      }
    }

    await agentRepository.delete(agentId);
    return agent;
  }

  // Admin: reassign agent to a different beach
  async reassignAgent(agentId, newBeachId) {
    const agent = await agentRepository.findAgentById(agentId);
    if (!agent) throw new NotFoundError('Agent');

    const beach = await Beach.findById(newBeachId);
    if (!beach || !beach.isActive) throw new NotFoundError('Beach');

    // Check if max agents already assigned
    if (beach.assignedAgents && beach.assignedAgents.length >= 2) {
      throw new Error('Beach already has maximum 2 agents assigned');
    }

    // Remove agent from old beach if exists
    if (agent.assignedBeach) {
      const oldBeach = await Beach.findById(agent.assignedBeach);
      if (oldBeach) {
        oldBeach.assignedAgents = oldBeach.assignedAgents.filter(
          (id) => id.toString() !== agentId
        );
        await oldBeach.save();
      }
    }

    // Add agent to new beach
    if (!beach.assignedAgents) {
      beach.assignedAgents = [];
    }
    beach.assignedAgents.push(agentId);
    await beach.save();

    // Update agent's assignedBeach
    return agentRepository.update(agentId, { assignedBeach: newBeachId });
  }
}

module.exports = new AgentService();
