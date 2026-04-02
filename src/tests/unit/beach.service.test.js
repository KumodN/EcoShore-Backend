const beachService = require('../../service/beach.service');
const Beach = require('../../models/Beach');
const { NotFoundError } = require('../../utils/AppError');

jest.mock('../../models/Beach');

describe('Beach Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBeach', () => {
    it('should create and save a new beach', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      // Mock the Beach constructor
      Beach.mockImplementation((data) => ({
        ...data,
        save: mockSave,
      }));

      const beachData = { name: 'Sunset Beach' };
      const userId = 'admin1';

      const result = await beachService.createBeach(beachData, userId);

      expect(result.name).toBe('Sunset Beach');
      expect(result.createdBy).toBe('admin1');
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('getAllBeaches', () => {
    it('should retrieve beaches sorted and paginated', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
      };

      // Override populate twice
      mockQuery.populate
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce([{ id: 1 }]);

      Beach.find.mockReturnValue(mockQuery);
      Beach.countDocuments.mockResolvedValue(1);

      const result = await beachService.getAllBeaches({
        page: 1,
        limit: 10,
        city: 'City',
      });

      expect(Beach.find).toHaveBeenCalledWith({
        'location.city': 'City',
        isActive: true,
      });
      expect(result.pagination.total).toBe(1);
      expect(result.beaches).toHaveLength(1);
    });
  });

  describe('getBeachById', () => {
    it('should successfully find a beach by ID', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
      };
      mockQuery.populate
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce({ _id: '123' });
      Beach.findById.mockReturnValue(mockQuery);

      const result = await beachService.getBeachById('123');
      expect(result._id).toBe('123');
    });

    it('should throw NotFoundError if beach does not exist', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
      };
      mockQuery.populate
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce(null);
      Beach.findById.mockReturnValue(mockQuery);

      await expect(beachService.getBeachById('404')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('updateBeach', () => {
    it('should update specific fields on the beach document', async () => {
      const mockSave = jest.fn();
      Beach.findById.mockResolvedValue({
        _id: '123',
        location: { city: 'Old' },
        save: mockSave,
      });

      const updateData = { name: 'Renamed Beach', location: { city: 'New' } };

      const result = await beachService.updateBeach(
        '123',
        updateData,
        'admin1'
      );

      expect(result.name).toBe('Renamed Beach');
      expect(result.location.city).toBe('New'); // Deep merge test
      expect(mockSave).toHaveBeenCalled();
    });
  });
});
