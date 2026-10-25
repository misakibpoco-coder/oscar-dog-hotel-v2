import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { pool } from '../../src/database/index.js';

describe('Oscar Dog Hotel REST API Integration Test Suite', () => {
  let authToken = '';
  let sharedAccountId = '';

  beforeAll(async () => {
    // Perform staff login to obtain JWT for protected routes
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@oscardoghotel.com',
        password: 'OscarHotel2026!'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.accessToken).toBeDefined();

    authToken = loginRes.body.data.accessToken;
    sharedAccountId = loginRes.body.data.account.id;
  });

  afterAll(async () => {
    // Close pg pool connection cleanly
    await pool.end();
  });

  describe('1. System & Registry Endpoints', () => {
    it('GET /api/health returns healthy status and hotel timezone', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.timezone).toBe('Europe/Nicosia');
    });

    it('GET /api/v1/docs.json serves valid OpenAPI 3.0 specification', async () => {
      const res = await request(app).get('/api/v1/docs.json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.3');
      expect(res.body.info.title).toContain('Oscar Dog Hotel');
    });

    it('GET /api/v1/avatars returns exactly 5 universal avatars', async () => {
      const res = await request(app).get('/api/v1/avatars');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(5);
      const ids = res.body.data.map((a: any) => a.id);
      expect(ids).toEqual(['avatar_1', 'avatar_2', 'avatar_3', 'avatar_4', 'avatar_5']);
    });

    it('GET /api/v1/statuses returns exactly 6 universal operational statuses', async () => {
      const res = await request(app).get('/api/v1/statuses');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(6);
      const ids = res.body.data.map((s: any) => s.id);
      expect(ids).toEqual([
        'RECEIVED',
        'IN_HOTEL',
        'UPCOMING',
        'COMPLETE',
        'CANCEL',
        'OUTGOING'
      ]);
    });
  });

  describe('2. Authentication & Security Layer', () => {
    it('POST /api/v1/auth/login rejects invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@oscardoghotel.com',
          password: 'WrongPassword123!'
        });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_INVALID');
    });

    it('GET /api/v1/auth/me returns current authenticated shared staff account', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('admin@oscardoghotel.com');
      expect(res.body.data.hotelName).toBe('Oscar Dog Hotel');
    });

    it('Rejects requests without authorization header on protected routes', async () => {
      const res = await request(app).get('/api/v1/dogs');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_INVALID');
    });
  });

  describe('3. Phone-First Owner Resolution & Conflict Detection', () => {
    const testPhone = '+357 99 887766';
    let createdOwnerId = '';

    it('Creates a new owner with normalized phone on first registration', async () => {
      const res = await request(app)
        .post('/api/v1/owners')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Andreas Georgiou',
          phone: testPhone,
          email: 'andreas.g@example.com'
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data.normalizedPhone).toBe('+35799887766');
      createdOwnerId = res.body.data.id;
    });

    it('Allows creating a new owner record with the same phone number for multiple owner records', async () => {
      const res = await request(app)
        .post('/api/v1/owners')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Konstantinos Papadopoulos', // Different name!
          phone: testPhone, // Same phone!
          email: 'kp@example.com'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).not.toBe(createdOwnerId);
      expect(res.body.data.isNew).toBe(true);
    });

    it('Resolves conflict cleanly when confirmExistingOwnerId is provided', async () => {
      const res = await request(app)
        .post('/api/v1/owners')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Konstantinos Papadopoulos',
          phone: testPhone,
          confirmExistingOwnerId: createdOwnerId
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdOwnerId);
      expect(res.body.data.isNew).toBe(false);
    });
  });

  describe('4. Dog Management, Validation & Strictly Scoped Search', () => {
    let createdDogId = '';
    const uniqueDogName = `Zeus-${Date.now()}`;
    const uniqueBreed = 'UniqueRareGreyhound';
    const uniqueNote = 'SuperSecretDietRequirementsForZeus';
    const ownerName = 'Maria Petridou';
    const ownerPhone = '+357 96 554433';

    it('Rejects dog creation with invalid avatar id (strict 5 avatars)', async () => {
      const res = await request(app)
        .post('/api/v1/dogs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: uniqueDogName,
          breed: uniqueBreed,
          gender: 'Male',
          avatarId: 'avatar_99', // Invalid!
          ownerName,
          ownerPhone
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Creates dog profile atomically with owner resolution', async () => {
      const res = await request(app)
        .post('/api/v1/dogs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: uniqueDogName,
          breed: uniqueBreed,
          gender: 'Male',
          weightKg: 28.5,
          avatarId: 'avatar_2',
          specialNotes: uniqueNote,
          ownerName,
          ownerPhone
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(uniqueDogName);
      expect(res.body.data.avatarId).toBe('avatar_2');
      expect(res.body.data.owner.name).toBe(ownerName);
      createdDogId = res.body.data.id;
    });

    it('Finds dog by Dog Name', async () => {
      const res = await request(app)
        .get(`/api/v1/dogs?search=${encodeURIComponent(uniqueDogName)}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].id).toBe(createdDogId);
    });

    it('Finds dog by Owner Name', async () => {
      const res = await request(app)
        .get(`/api/v1/dogs?search=${encodeURIComponent(ownerName)}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const found = res.body.data.some((d: any) => d.id === createdDogId);
      expect(found).toBe(true);
    });

    it('Finds dog by Owner Phone', async () => {
      const res = await request(app)
        .get(`/api/v1/dogs?search=${encodeURIComponent('96554433')}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const found = res.body.data.some((d: any) => d.id === createdDogId);
      expect(found).toBe(true);
    });

    it('Does NOT find dog when searching by Breed (Strictly Scoped Search Rule)', async () => {
      const res = await request(app)
        .get(`/api/v1/dogs?search=${encodeURIComponent(uniqueBreed)}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const found = res.body.data.some((d: any) => d.id === createdDogId);
      expect(found).toBe(false); // Excluded by requirement 21!
    });

    it('Does NOT find dog when searching by Special Notes (Strictly Scoped Search Rule)', async () => {
      const res = await request(app)
        .get(`/api/v1/dogs?search=${encodeURIComponent(uniqueNote)}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const found = res.body.data.some((d: any) => d.id === createdDogId);
      expect(found).toBe(false); // Excluded by requirement 21!
    });

    it('Archives dog and verifies booking blocking', async () => {
      // Archive dog
      const archiveRes = await request(app)
        .post(`/api/v1/dogs/${createdDogId}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Seasonal leave' });

      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.data.isArchived).toBe(true);

      // Verify dog is hidden from default list
      const listRes = await request(app)
        .get(`/api/v1/dogs?search=${encodeURIComponent(uniqueDogName)}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(listRes.body.data.some((d: any) => d.id === createdDogId)).toBe(false);

      // Attempt booking on archived dog -> must fail with BOOKING_ARCHIVED_DOG_BLOCKED
      const now = new Date();
      const inDate = new Date(now.getTime() + 86400000 * 10);
      const outDate = new Date(now.getTime() + 86400000 * 15);

      const bookingRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dogId: createdDogId,
          checkInAt: inDate.toISOString(),
          checkOutAt: outDate.toISOString(),
          status: 'UPCOMING'
        });

      expect(bookingRes.status).toBe(400);
      expect(bookingRes.body.error.code).toBe('BOOKING_ARCHIVED_DOG_BLOCKED');

      // Restore dog
      const restoreRes = await request(app)
        .post(`/api/v1/dogs/${createdDogId}/restore`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.data.isArchived).toBe(false);
    });
  });

  describe('5. Bookings, Overlap Rules & Extension In-Place', () => {
    let testDogId = '';
    let booking1Id = '';

    beforeAll(async () => {
      // Create dog for booking tests
      const res = await request(app)
        .post('/api/v1/dogs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `BookingTestDog-${Date.now()}`,
          breed: 'Beagle',
          gender: 'Female',
          avatarId: 'avatar_3',
          ownerName: 'Elena K.',
          ownerPhone: '+357 99 332211'
        });
      testDogId = res.body.data.id;
    });

    it('Creates a booking successfully', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dogId: testDogId,
          checkInAt: '2026-10-10T10:00:00Z',
          checkOutAt: '2026-10-15T12:00:00Z',
          status: 'UPCOMING',
          services: ['Boarding', 'Grooming'],
          notes: 'First time stay'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentStatus).toBe('UPCOMING');
      expect(res.body.data.duration.nights).toBe(5);
      booking1Id = res.body.data.id;
    });

    it('Rejects overlapping booking on same dog with 409 BOOKING_OVERLAP', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dogId: testDogId,
          checkInAt: '2026-10-12T10:00:00Z', // Overlaps Oct 10 - Oct 15!
          checkOutAt: '2026-10-18T12:00:00Z',
          status: 'UPCOMING'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BOOKING_OVERLAP');
    });

    it('Allows back-to-back booking (touching boundary) for same dog', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dogId: testDogId,
          checkInAt: '2026-10-15T12:00:00Z', // Starts exactly when previous ends!
          checkOutAt: '2026-10-20T12:00:00Z',
          status: 'UPCOMING'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('Extends stay in-place by updating scheduled checkout date', async () => {
      const newCheckOut = '2026-10-15T11:00:00Z';
      const res = await request(app)
        .post(`/api/v1/bookings/${booking1Id}/extend`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newCheckOutAt: newCheckOut,
          notes: 'Owner request early morning pickup'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(new Date(res.body.data.checkOutAt).toISOString()).toBe(new Date(newCheckOut).toISOString());
    });
  });

  describe('6. Dashboard Aggregations & Status Flow', () => {
    it('GET /api/v1/dashboard/stats returns real-time calculated operational metrics', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('inHotelCount');
      expect(res.body.data).toHaveProperty('upcomingCount');
      expect(res.body.data).toHaveProperty('todayCheckIn');
      expect(res.body.data).toHaveProperty('todayCheckOut');
      expect(res.body.data).toHaveProperty('overdueAttentionCount');
    });

    it('GET /api/v1/dashboard/attention returns attention list with reason and overdue state', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/attention')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
