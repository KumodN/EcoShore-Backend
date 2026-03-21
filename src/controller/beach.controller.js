const beachService = require('../service/beach.service');
const catchAsync = require('../utils/catchAsync');
const ResponseHandler = require('../utils/responseHandler');

class BeachController {
  /**
   * Helper method to format beach response
   */
  formatBeachResponse(beach) {
    return {
      id: beach._id,
      name: beach.name,
      location: {
        address: beach.location?.address,
        city: beach.location?.city,
        country: beach.location?.country,
        coordinates: beach.location?.coordinates,
      },
      description: beach.description,
      analytics: {
        totalWasteCollected: beach.analytics?.totalWasteCollected || 0,
        totalCleanups: beach.analytics?.totalCleanups || 0,
        lastCleanupDate: beach.analytics?.lastCleanupDate,
        severityScore: beach.analytics?.severityScore || 0,
        severityLevel: beach.analytics?.severityLevel || 'LOW',
      },
      isActive: beach.isActive,
      image: beach.image,
      createdAt: beach.createdAt,
      updatedAt: beach.updatedAt,
    };
  }

  /**
   * Create new beach
   */
  createBeach = catchAsync(async (req, res) => {
    const beach = await beachService.createBeach(req.body, req.user.id);

    return ResponseHandler.created(
      res,
      {
        beach: this.formatBeachResponse(beach),
      },
      'Beach created successfully'
    );
  });

  /**
   * Get all beaches
   */
  getBeaches = catchAsync(async (req, res) => {
    const result = await beachService.getAllBeaches(req.query);

    const formattedBeaches = result.beaches.map((beach) =>
      this.formatBeachResponse(beach)
    );

    return ResponseHandler.paginated(
      res,
      formattedBeaches,
      req.query.page || 1,
      req.query.limit || 10,
      result.pagination.total,
      'Beaches retrieved successfully'
    );
  });

  /**
   * Get beach by ID
   */
  getBeachById = catchAsync(async (req, res) => {
    const beach = await beachService.getBeachById(req.params.beachId);

    return ResponseHandler.success(
      res,
      {
        beach: this.formatBeachResponse(beach),
      },
      'Beach retrieved successfully'
    );
  });

  /**
   * Update beach
   */
  updateBeach = catchAsync(async (req, res) => {
    const beach = await beachService.updateBeach(
      req.params.beachId,
      req.body,
      req.user.id
    );

    return ResponseHandler.success(
      res,
      {
        beach: this.formatBeachResponse(beach),
      },
      'Beach updated successfully'
    );
  });

  /**
   * Delete beach (soft delete)
   */
  deleteBeach = catchAsync(async (req, res) => {
    await beachService.deleteBeach(req.params.beachId);

    return ResponseHandler.success(res, null, 'Beach deleted successfully');
  });

  /**
   * Get severity ranking
   */
  getSeverityRanking = catchAsync(async (req, res) => {
    const limit = req.query.limit || 10;
    const beaches = await beachService.getSeverityRanking(limit);

    const ranking = beaches.map((beach) => ({
      id: beach._id,
      name: beach.name,
      city: beach.location?.city,
      severityScore: beach.analytics?.severityScore,
      severityLevel: beach.analytics?.severityLevel,
      totalWasteCollected: beach.analytics?.totalWasteCollected,
    }));

    return ResponseHandler.success(
      res,
      {
        ranking,
      },
      'Severity ranking retrieved successfully'
    );
  });
}

module.exports = new BeachController();
