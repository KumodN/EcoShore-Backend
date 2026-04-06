const analyticsController = require('../../controller/analytics.controller');
const analyticsService = require('../../service/analytics.service');

// Mock the core service
jest.mock('../../service/analytics.service');

// Mock response object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock async handler error testing utility
const mockNext = jest.fn();

describe('Analytics Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardOverview', () => {
    it('should return 200 and dashboard data', async () => {
      const req = { query: { startDate: '2025-01-01', endDate: '2025-12-31' } };
      const res = mockResponse();
      const mockDashboardResult = { summary: { totalBeaches: 5 } };

      analyticsService.getDashboardOverview.mockResolvedValue(
        mockDashboardResult
      );

      await analyticsController.getDashboardOverview(req, res, mockNext);

      expect(analyticsService.getDashboardOverview).toHaveBeenCalledWith(
        '2025-01-01',
        '2025-12-31'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Dashboard overview retrieved successfully',
          data: { dashboard: mockDashboardResult },
        })
      );
    });
  });

  describe('getSeverityRanking', () => {
    it('should return severity ranking', async () => {
      const req = { query: { limit: '5' } };
      const res = mockResponse();
      const mockRanking = [{ name: 'Beach A', severityScore: 80 }];

      analyticsService.getSeverityRanking.mockResolvedValue(mockRanking);

      await analyticsController.getSeverityRanking(req, res, mockNext);

      expect(analyticsService.getSeverityRanking).toHaveBeenCalledWith('5');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Severity ranking retrieved successfully',
          data: { ranking: mockRanking },
        })
      );
    });
  });

  describe('predictTrends', () => {
    it('should generate trend forecast', async () => {
      const req = { query: { beachId: 'some-id', months: '6' } };
      const res = mockResponse();
      const mockForecast = { success: true, forecast: [] };

      analyticsService.predictPollutionTrend.mockResolvedValue(mockForecast);

      await analyticsController.predictTrends(req, res, mockNext);

      expect(analyticsService.predictPollutionTrend).toHaveBeenCalledWith(
        'some-id',
        '6'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { prediction: mockForecast },
        })
      );
    });
  });

  describe('exportAnalyticsJSON', () => {
    it('should format and export all analytics data', async () => {
      const req = {
        query: { startDate: '2025', endDate: '2026', beachId: 'some-id' },
      };
      const res = mockResponse();

      analyticsService.getDashboardOverview.mockResolvedValue({
        summary: { val: 1 },
      });
      analyticsService.getSeverityRanking.mockResolvedValue([{ beach: 'B' }]);
      analyticsService.getCarbonOffsetSummary.mockResolvedValue({
        summary: { carbon: 10 },
        equivalents: {},
      });
      analyticsService.predictPollutionTrend.mockResolvedValue({
        forecast: [],
      });

      await analyticsController.exportAnalyticsJSON(req, res, mockNext);

      if (mockNext.mock.calls.length > 0) {
        console.error(mockNext.mock.calls[0][0]);
      }

      expect(mockNext).not.toHaveBeenCalled();
      expect(analyticsService.getDashboardOverview).toHaveBeenCalled();
      expect(analyticsService.getSeverityRanking).toHaveBeenCalledWith(50);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            exportData: expect.objectContaining({
              dateRange: { startDate: '2025', endDate: '2026' },
            }),
          }),
        })
      );
    });
  });
});
