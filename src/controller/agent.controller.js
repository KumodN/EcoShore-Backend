const agentService = require('../service/agent.service');
const catchAsync = require('../utils/catchAsync');
const ResponseHandler = require('../utils/responseHandler');
const logger = require('../config/logger');

class AgentController {
  formatAgentResponse(agent) {
    return {
      id: agent._id,
      email: agent.email,
      name: agent.name,
      nic: agent.nic,
      role: agent.role,
      assignedBeach: agent.assignedBeach
        ? {
            id: agent.assignedBeach._id || agent.assignedBeach,
            name: agent.assignedBeach?.name,
            city: agent.assignedBeach?.location?.city,
            isActive: agent.assignedBeach?.isActive,
          }
        : null,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }

  // POST /api/agents  (admin only)
  registerAgent = async (req, res) => {
    try {
      const result = await agentService.createAgent(req.body);
      return ResponseHandler.created(
        res,
        { agent: result.agent },
        'Beach agent registered successfully'
      );
    } catch (err) {
      logger.error('Agent registration failed', err);
      if (err.message === 'USER_EXISTS') {
        return res.status(400).json({ error: 'Email already in use' });
      }
      if (err.message === 'NIC_EXISTS') {
        return res.status(400).json({ error: 'NIC already registered' });
      }
      if (err.message === 'BEACH_NOT_FOUND') {
        return res.status(404).json({ error: 'Beach not found or inactive' });
      }
      if (err.message === 'BEACH_MAX_AGENTS') {
        return res
          .status(400)
          .json({ error: 'Beach already has maximum 2 agents assigned' });
      }
      return res.status(500).json({ error: 'Server Error' });
    }
  };

  // GET /api/agents  (admin only)
  getAllAgents = catchAsync(async (req, res) => {
    const agents = await agentService.getAllAgents();
    return ResponseHandler.success(
      res,
      { agents: agents.map((a) => this.formatAgentResponse(a)) },
      'Agents retrieved successfully'
    );
  });

  // GET /api/agents/:agentId  (admin only)
  getAgentById = catchAsync(async (req, res) => {
    const agent = await agentService.getAgentById(req.params.agentId);
    return ResponseHandler.success(
      res,
      { agent: this.formatAgentResponse(agent) },
      'Agent retrieved successfully'
    );
  });

  // DELETE /api/agents/:agentId  (admin only)
  deleteAgent = catchAsync(async (req, res) => {
    await agentService.deleteAgent(req.params.agentId);
    return ResponseHandler.success(res, null, 'Agent deleted successfully');
  });

  // PATCH /api/agents/:agentId/reassign/:beachId  (admin only)
  reassignAgent = catchAsync(async (req, res) => {
    const agent = await agentService.reassignAgent(
      req.params.agentId,
      req.params.beachId
    );
    return ResponseHandler.success(
      res,
      { agent: this.formatAgentResponse(agent) },
      'Agent reassigned successfully'
    );
  });
}

module.exports = new AgentController();
