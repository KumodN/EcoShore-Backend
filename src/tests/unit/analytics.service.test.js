const analyticsService = require('../../service/analytics.service');
const beachRepository = require('../../repository/beach.repository');
const wasteRecordRepository = require('../../repository/wasteRecord.repository');
const { CarbonConfig, WasteRecord, Beach } = require('../../models');
const Event = require('../../models/Event');

jest.mock('../../repository/beach.repository');
jest.mock('../../repository/wasteRecord.repository');
jest.mock('../../models', () => ({
  CarbonConfig: { getActiveConfig: jest.fn() },
  WasteRecord: {
    aggregate: jest.fn(),
    distinct: jest.fn(),
    find: jest.fn(),
    bulkWrite: jest.fn(),
  },
  Beach: { find: jest.fn() },
}));
jest.mock('../../models/Event', () => ({
  countDocuments: jest.fn(),
}));

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardOverview', () => {
    it('should aggregate data for dashboard overview', async () => {
      WasteRecord.aggregate.mockResolvedValue([
        { totalWasteCollected: 100, totalCarbonOffset: 250 },
      ]);
      WasteRecord.distinct.mockResolvedValue(['beach1', 'beach2']);
      Event.countDocuments.mockResolvedValue(5);
      beachRepository.getSeverityRanking.mockResolvedValue([
        {
          _id: 'bad-beach-id',
          name: 'Bad Beach',
          location: { city: 'City A' },
          analytics: { severityScore: 90, totalWasteCollected: 500 },
        },
      ]);
      wasteRecordRepository.getMonthlyTrends.mockResolvedValue([
        { _id: { month: 1 }, totalWeight: 10 },
      ]);
      beachRepository.getDashboardStats.mockResolvedValue({ avgSeverity: 30 });

      const result = await analyticsService.getDashboardOverview(
        '2025-01-01',
        '2025-12-31'
      );

      expect(result.summary.totalBeaches).toBe(2);
      expect(result.summary.totalWasteCollected).toBe(100);
      expect(result.summary.totalCleanups).toBe(5);
      expect(result.mostPollutedBeach.name).toBe('Bad Beach');
    });
  });

  describe('getSeverityRanking', () => {
    it('should merge offset data with severity ranking', async () => {
      beachRepository.getSeverityRanking.mockResolvedValue([
        { _id: 'beach1', name: 'Beach One', analytics: { severityScore: 50 } },
      ]);

      WasteRecord.aggregate.mockResolvedValue([
        { _id: 'beach1', totalCarbonOffset: 15.5 },
      ]);

      const result = await analyticsService.getSeverityRanking(10);

      expect(result).toHaveLength(1);
      expect(result[0].totalCarbonOffset).toBe(15.5);
    });
  });

  describe('predictPollutionTrend', () => {
    it('should calculate moving average for forecasting', async () => {
      // Mock minimum required data points for the trend
      const mockHistory = [
        { _id: { year: 2025, month: 1 }, totalWeight: 100 },
        { _id: { year: 2025, month: 2 }, totalWeight: 110 },
        { _id: { year: 2025, month: 3 }, totalWeight: 120 },
        { _id: { year: 2025, month: 4 }, totalWeight: 130 },
        { _id: { year: 2025, month: 5 }, totalWeight: 140 },
        { _id: { year: 2025, month: 6 }, totalWeight: 150 },
      ];

      wasteRecordRepository.getMonthlyTrends.mockResolvedValue(mockHistory);
      CarbonConfig.getActiveConfig.mockResolvedValue({ emissionFactor: 2.0 });

      const result = await analyticsService.predictPollutionTrend(
        'some-beach',
        3
      );

      expect(result.success).toBe(true);
      expect(result.forecast).toHaveLength(3);
      expect(result.trend.direction).toBeDefined();
    });

    it('should fail if insufficient data points', async () => {
      wasteRecordRepository.getMonthlyTrends.mockResolvedValue([
        { totalWeight: 100 },
      ]);

      const result = await analyticsService.predictPollutionTrend(
        'some-beach',
        3
      );

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Insufficient data/);
    });
  });
});
