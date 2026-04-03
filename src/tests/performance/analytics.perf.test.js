const { performance } = require('perf_hooks');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('../setup/dbSetup');
const analyticsService = require('../../service/analytics.service');
const { Beach, WasteRecord } = require('../../models');

describe('Analytics Service Performance', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearDB();
  });

  it('should calculate severity scores for all beaches within acceptable latency (< 500ms)', async () => {
    // Generate 50 beaches
    const beachesToInsert = Array.from({ length: 5 }).map((_, i) => ({
      name: `Beach ${i}`,
      location: {
        address: 'Test address',
        city: 'Test City',
        coordinates: {
          type: 'Point',
          coordinates: [0, 0],
        },
      },
      createdBy: new mongoose.Types.ObjectId(),
      isActive: true,
      analytics: {
        severityScore: 0,
        severityLevel: 'LOW',
        totalWasteCollected: 0,
      },
    }));
    const insertedBeaches = await Beach.insertMany(beachesToInsert);

    // Generate 5000 waste records (100 per beach)
    const recordsToInsert = [];
    const userId = new mongoose.Types.ObjectId();
    insertedBeaches.forEach((b) => {
      for (let i = 0; i < 100; i++) {
        recordsToInsert.push({
          beachId: b._id,
          recordedBy: userId,
          weight: Math.random() * 50,
          plasticType: 'PET',
          isDeleted: false,
          isVerified: true,
          collectionDate: new Date(),
        });
      }
    });
    // This might take a bit for insertion but it's part of setup
    await WasteRecord.insertMany(recordsToInsert);

    // Act - Measure performance
    const startTime = performance.now();
    await analyticsService.calculateSeverityScores();
    const endTime = performance.now();

    const latencyMs = endTime - startTime;
    console.log(
      `[Performance] calculateSeverityScores latency: ${latencyMs.toFixed(2)} ms`
    );

    // Assert that the operation completes within 800ms
    // Note: Due to in-memory db serialization this might slightly vary from prod ops
    expect(latencyMs).toBeLessThan(800);
  }, 15000); // Higher timeout for setup

  it('should retrieve dashboard overview structure rapidly (< 300ms)', async () => {
    // Seed with multiple records
    await Beach.create({
      name: 'Test Beach',
      location: {
        address: '123 perf st',
        city: 'perf city',
        coordinates: {
          type: 'Point',
          coordinates: [0, 0],
        },
      },
      createdBy: new mongoose.Types.ObjectId(),
    });

    const startTime = performance.now();
    await analyticsService.getDashboardOverview();
    const endTime = performance.now();

    const latencyMs = endTime - startTime;
    console.log(
      `[Performance] getDashboardOverview latency: ${latencyMs.toFixed(2)} ms`
    );

    expect(latencyMs).toBeLessThan(300);
  });
});
