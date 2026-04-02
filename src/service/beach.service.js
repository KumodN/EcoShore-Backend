const Beach = require('../models/Beach');
const { NotFoundError } = require('../utils/AppError');

class BeachService {
  /**
   * Create a new beach
   */
  async createBeach(beachData, userId) {
    const beach = new Beach({
      ...beachData,
      createdBy: userId,
    });

    await beach.save();
    return beach;
  }

  /**
   * Get all beaches with pagination
   */
  async getAllBeaches(query) {
    const {
      page = 1,
      limit = 10,
      city,
      isActive = true,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const filter = { isActive };
    if (city) filter['location.city'] = city;

    const sort = {};
    sort[sortBy] = order === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [beaches, total] = await Promise.all([
      Beach.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name email')
        .populate('assignedAgents', 'name email'),
      Beach.countDocuments(filter),
    ]);

    return {
      beaches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get beach by ID
   */
  async getBeachById(beachId) {
    const beach = await Beach.findById(beachId)
      .populate('createdBy', 'name email')
      .populate('assignedAgents', 'name email');

    if (!beach) {
      throw new NotFoundError('Beach');
    }

    return beach;
  }

  /**
   * Update beach
   */
  async updateBeach(beachId, updateData, userId) {
    const beach = await Beach.findById(beachId);

    if (!beach) {
      throw new NotFoundError('Beach');
    }

    // Update fields
    Object.keys(updateData).forEach((key) => {
      if (key === 'location') {
        beach.location = { ...beach.location, ...updateData.location };
      } else {
        beach[key] = updateData[key];
      }
    });

    await beach.save();
    return beach;
  }

  /**
   * Delete beach (soft delete)
   */
  async deleteBeach(beachId) {
    const beach = await Beach.findById(beachId);

    if (!beach) {
      throw new NotFoundError('Beach');
    }

    beach.isActive = false;
    await beach.save();

    return beach;
  }

  /**
   * Get severity ranking
   */
  async getSeverityRanking(limit = 10) {
    const beaches = await Beach.find({ isActive: true })
      .sort({ 'analytics.severityScore': -1 })
      .limit(limit)
      .select(
        'name location.city analytics.severityScore analytics.severityLevel analytics.totalWasteCollected'
      );

    return beaches;
  }
}

module.exports = new BeachService();
