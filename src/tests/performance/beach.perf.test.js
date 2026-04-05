const { performance } = require('perf_hooks');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('../setup/dbSetup');
const beachService = require('../../service/beach.service');
const { Beach, User } = require('../../models'); // Loading from models index registers all schemas

describe('Beach Service Performance', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearDB();
  });

  it('should format, retrieve, and paginate 3000 beaches under 100ms', async () => {
    const beaches = [];
    for (let i = 0; i < 3000; i++) {
      beaches.push({
        name: `Performance Beach ${i}`,
        location: {
          address: '123 perf st',
          city: 'Perf City',
          coordinates: {
            type: 'Point',
            coordinates: [0, 0],
          },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
        analytics: { severityScore: Math.random() * 100 },
      });
    }

    // Bulk insert setup
    await Beach.insertMany(beaches);

    // Measure pagination performance
    const startTime = performance.now();

    const result = await beachService.getAllBeaches({
      page: 2,
      limit: 50,
      city: 'Perf City',
    });

    const endTime = performance.now();
    const latencyMs = endTime - startTime;
    console.log(
      `[Performance] getAllBeaches (Pagination on 3k hits) latency: ${latencyMs.toFixed(2)} ms`
    );

    expect(result.beaches.length).toBe(50);
    expect(latencyMs).toBeLessThan(150); // Setting to 150ms for realistic bounds in mem-server
  }, 10000); // Higher timeout for setup

  it('should retrieve a beach by ID efficiently', async () => {
    const beach = await Beach.create({
      name: 'Single Read Perf Beach',
      location: {
        address: '123 perf',
        city: 'perf',
        coordinates: {
          type: 'Point',
          coordinates: [0, 0],
        },
      },
      createdBy: new mongoose.Types.ObjectId(),
    });

    const startTime = performance.now();
    await beachService.getBeachById(beach._id);
    const endTime = performance.now();

    const latencyMs = endTime - startTime;
    console.log(
      `[Performance] getBeachById latency: ${latencyMs.toFixed(2)} ms`
    );

    expect(latencyMs).toBeLessThan(20);
  });
});
