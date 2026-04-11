const { performance } = require('perf_hooks');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('../setup/dbSetup');
const meetingService = require('../../service/meeting.service');
const Meeting = require('../../models/Meeting');
const User = require('../../models/User');

describe('Meeting Service Performance', () => {
  let organizerId;
  let participantId;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearDB();

    organizerId = new mongoose.Types.ObjectId();
    participantId = new mongoose.Types.ObjectId();

    await User.create([
      {
        _id: organizerId,
        name: 'Organizer Perf',
        email: 'organizer-perf@meeting.test',
        password: 'password123',
        role: 'organizer',
      },
      {
        _id: participantId,
        name: 'Participant Perf',
        email: 'participant-perf@meeting.test',
        password: 'password123',
        role: 'volunteer',
      },
    ]);
  });

  it('should retrieve 800 participant meetings under 1200ms', async () => {
    const meetings = Array.from({ length: 800 }).map((_, index) => ({
      title: `Meeting ${index}`,
      createdBy: organizerId,
      participants: [organizerId, participantId],
      scheduledAt: new Date(Date.now() + index * 60 * 1000),
      isInstant: false,
      status: 'scheduled',
    }));

    await Meeting.insertMany(meetings);

    const startTime = performance.now();
    const result = await meetingService.getMyMeetings(organizerId.toString());
    const endTime = performance.now();

    const latencyMs = endTime - startTime;
    console.log(
      `[Performance] meetingService.getMyMeetings on 800 rows: ${latencyMs.toFixed(2)} ms`
    );

    expect(result).toHaveLength(800);
    expect(latencyMs).toBeLessThan(1200);
  }, 15000);

  it('should start a scheduled meeting under 300ms', async () => {
    const meeting = await Meeting.create({
      title: 'Start Perf Meeting',
      createdBy: organizerId,
      participants: [organizerId, participantId],
      scheduledAt: new Date(Date.now() + 10 * 60 * 1000),
      isInstant: false,
      status: 'scheduled',
    });

    const startTime = performance.now();
    const startedMeeting = await meetingService.startMeeting(
      meeting._id.toString(),
      {
        id: organizerId.toString(),
        role: 'organizer',
      }
    );
    const endTime = performance.now();

    const latencyMs = endTime - startTime;
    console.log(
      `[Performance] meetingService.startMeeting latency: ${latencyMs.toFixed(2)} ms`
    );

    expect(startedMeeting.status).toBe('ongoing');
    expect(latencyMs).toBeLessThan(300);
  });
});
