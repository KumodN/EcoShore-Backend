const beachController = require('../../controller/beach.controller');
const beachService = require('../../service/beach.service');

// Mock the Service layer
jest.mock('../../service/beach.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Beach Controller Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBeach', () => {
    it('should format output and return 201 created status', async () => {
      const mockBeach = { _id: '123', name: 'New Beach', isActive: true };
      beachService.createBeach.mockResolvedValue(mockBeach);

      const req = { body: { name: 'New Beach' }, user: { id: 'user-id' } };
      const res = mockResponse();

      await beachController.createBeach(req, res, mockNext);

      expect(beachService.createBeach).toHaveBeenCalledWith(
        req.body,
        'user-id'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            beach: expect.objectContaining({ id: '123', name: 'New Beach' }),
          },
        })
      );
    });
  });

  describe('getBeaches', () => {
    it('should apply pagination and formatting', async () => {
      const mockResult = { beaches: [{ _id: '1' }], pagination: { total: 1 } };
      beachService.getAllBeaches.mockResolvedValue(mockResult);

      const req = { query: { page: 1, limit: 10 } };
      const res = mockResponse();

      await beachController.getBeaches(req, res, mockNext);

      expect(beachService.getAllBeaches).toHaveBeenCalledWith(req.query);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({ total: 1 }),
          data: expect.any(Array),
        })
      );
    });
  });

  describe('getSeverityRanking', () => {
    it('should retrieve list of beaches by severity', async () => {
      const mockBeaches = [
        { _id: '2', name: 'Toxic Beach', analytics: { severityScore: 90 } },
      ];
      beachService.getSeverityRanking.mockResolvedValue(mockBeaches);

      const req = { query: { limit: 5 } };
      const res = mockResponse();

      await beachController.getSeverityRanking(req, res, mockNext);

      expect(beachService.getSeverityRanking).toHaveBeenCalledWith(5);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { ranking: expect.any(Array) },
        })
      );
    });
  });
});
