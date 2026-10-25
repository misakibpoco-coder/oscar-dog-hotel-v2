import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { pool, query } from '../../src/database/index.js';
import { formatInTimeZone } from 'date-fns-tz';

describe('Oscar Dog Hotel End-to-End Operational Lifecycle Test Suite', () => {
  let authToken = '';
  let sharedAccountId = '';
  let ownerId = '';
  let dogId = '';
  let bookingId = '';

  const testOwnerPhone = '+357 99 778899';
  const testOwnerName = 'Christos Nicolaou';
  const testDogName = `Apollo-${Date.now()}`;

  beforeAll(async () => {
    // 1. Authenticate shared staff account
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@oscardoghotel.com',
        password: 'OscarHotel2026!'
      });

    expect(loginRes.status).toBe(200);
    authToken = loginRes.body.data.accessToken;
    sharedAccountId = loginRes.body.data.account.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('Step 1: Authenticate and retrieve current staff session', async () => {
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe('admin@oscardoghotel.com');
    expect(meRes.body.data.hotelName).toBe('Oscar Dog Hotel');
  });

  it('Step 2: Onboard owner and dog atomically with phone normalization', async () => {
    const dogRes = await request(app)
      .post('/api/v1/dogs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: testDogName,
        breed: 'German Shepherd',
        gender: 'Male',
        weightKg: 34.0,
        avatarId: 'avatar_1',
        specialNotes: 'Active dog, prefers afternoon walks',
        ownerName: testOwnerName,
        ownerPhone: testOwnerPhone,
        ownerEmail: 'christos@example.com'
      });

    expect(dogRes.status).toBe(201);
    expect(dogRes.body.success).toBe(true);
    expect(dogRes.body.data.name).toBe(testDogName);
    expect(dogRes.body.data.avatarId).toBe('avatar_1');
    expect(dogRes.body.data.owner.phone).toBe('+35799778899'); // Normalized

    dogId = dogRes.body.data.id;
    ownerId = dogRes.body.data.owner.id;
  });

  it('Step 3: Create an upcoming booking with service options', async () => {
    const now = new Date();
    // Schedule booking for tomorrow to 5 days later
    const checkInDate = new Date(now.getTime() + 86400000);
    const checkOutDate = new Date(now.getTime() + 86400000 * 5);

    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        dogId,
        checkInAt: checkInDate.toISOString(),
        checkOutAt: checkOutDate.toISOString(),
        status: 'UPCOMING',
        services: ['Boarding', 'Daily Bath'],
        notes: 'Owner will drop off around 10:00 AM'
      });

    expect(bookingRes.status).toBe(201);
    expect(bookingRes.body.success).toBe(true);
    expect(bookingRes.body.data.currentStatus).toBe('UPCOMING');
    expect(bookingRes.body.data.duration.nights).toBe(4);

    bookingId = bookingRes.body.data.id;

    // Verify dog profile reflects UPCOMING status
    const dogDetailsRes = await request(app)
      .get(`/api/v1/dogs/${dogId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(dogDetailsRes.status).toBe(200);
    expect(dogDetailsRes.body.data.currentStatus).toBe('UPCOMING');
    expect(dogDetailsRes.body.data.currentBooking.id).toBe(bookingId);
  });

  it('Step 4: Check-in dog: update status to IN_HOTEL with effectiveAt', async () => {
    const checkInTime = new Date();

    const statusRes = await request(app)
      .post(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'IN_HOTEL',
        effectiveAt: checkInTime.toISOString(),
        notes: 'Dog arrived in good spirits and settled into room'
      });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.success).toBe(true);
    expect(statusRes.body.data.current_status).toBe('IN_HOTEL');

    // Verify status_history entry was created
    const historyRes = await query(
      'SELECT * FROM status_history WHERE booking_id = $1 ORDER BY changed_at DESC LIMIT 1',
      [bookingId]
    );

    expect(historyRes.rowCount).toBe(1);
    expect(historyRes.rows[0].new_status).toBe('IN_HOTEL');
    expect(historyRes.rows[0].previous_status).toBe('UPCOMING');
    expect(new Date(historyRes.rows[0].effective_at).toISOString()).toBe(checkInTime.toISOString());

    // Verify dog list shows dog as IN_HOTEL
    const dogsListRes = await request(app)
      .get(`/api/v1/dogs?status=IN_HOTEL`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(dogsListRes.status).toBe(200);
    const found = dogsListRes.body.data.some((d: any) => d.id === dogId);
    expect(found).toBe(true);
  });

  it('Step 5: Surface ACTION_REQUIRED when scheduled checkout passes without staff confirmation', async () => {
    // Simulate past checkout date in the database for testing overdue logic (checkOut > checkIn)
    const pastCheckIn = new Date(Date.now() - 86400000); // 24 hours ago
    const pastCheckOut = new Date(Date.now() - 3600000 * 2); // 2 hours ago
    await query('UPDATE bookings SET check_in_at = $1, check_out_at = $2, is_outgoing_confirmed = FALSE WHERE id = $3', [
      pastCheckIn.toISOString(),
      pastCheckOut.toISOString(),
      bookingId
    ]);

    // Check dashboard attention endpoint
    const attentionRes = await request(app)
      .get('/api/v1/dashboard/attention')
      .set('Authorization', `Bearer ${authToken}`);

    expect(attentionRes.status).toBe(200);
    const overdueDog = attentionRes.body.data.find((item: any) => item.dogId === dogId);
    expect(overdueDog).toBeDefined();
    expect(overdueDog.attention.isOverdue).toBe(true);
    expect(overdueDog.attention.attentionType).toBe('OUTGOING_CONFIRMATION_REQUIRED');
    expect(overdueDog.attention.overdueMinutes).toBeGreaterThanOrEqual(110);
  });

  it('Step 6: Extend stay in-place by updating scheduled checkout date', async () => {
    // Extend checkout to 4 days in the future
    const extendedCheckOut = new Date(Date.now() + 86400000 * 4);

    const extendRes = await request(app)
      .post(`/api/v1/bookings/${bookingId}/extend`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        newCheckOutAt: extendedCheckOut.toISOString(),
        notes: 'Owner requested 4-day extension due to flight delay'
      });

    expect(extendRes.status).toBe(200);
    expect(extendRes.body.success).toBe(true);

    // Overdue attention alert is now cleared
    const attentionRes = await request(app)
      .get('/api/v1/dashboard/attention')
      .set('Authorization', `Bearer ${authToken}`);

    const isStillOverdue = attentionRes.body.data.some((item: any) => item.dogId === dogId);
    expect(isStillOverdue).toBe(false);
  });

  it('Step 7: Confirm departure and transition to OUTGOING then COMPLETE', async () => {
    // 1. Confirm outgoing departure
    const outgoingRes = await request(app)
      .post(`/api/v1/bookings/${bookingId}/confirm-outgoing`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(outgoingRes.status).toBe(200);
    expect(outgoingRes.body.data.currentStatus).toBe('OUTGOING');
    expect(outgoingRes.body.data.isOutgoingConfirmed).toBe(true);

    // 2. Complete stay
    const completeRes = await request(app)
      .post(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'COMPLETE',
        effectiveAt: new Date().toISOString(),
        notes: 'Owner picked up dog with all belongings'
      });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.current_status).toBe('COMPLETE');
  });

  it('Step 8: Soft archive dog, verify booking blocking, then restore', async () => {
    // 1. Archive dog
    const archiveRes = await request(app)
      .post(`/api/v1/dogs/${dogId}/archive`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.data.isArchived).toBe(true);

    // 2. Attempt booking on archived dog -> must fail
    const nextWeek = new Date(Date.now() + 86400000 * 7);
    const nextWeekEnd = new Date(Date.now() + 86400000 * 10);

    const blockedRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        dogId,
        checkInAt: nextWeek.toISOString(),
        checkOutAt: nextWeekEnd.toISOString(),
        status: 'UPCOMING'
      });

    expect(blockedRes.status).toBe(400);
    expect(blockedRes.body.error.code).toBe('BOOKING_ARCHIVED_DOG_BLOCKED');

    // 3. Restore dog profile
    const restoreRes = await request(app)
      .post(`/api/v1/dogs/${dogId}/restore`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.data.isArchived).toBe(false);

    // 4. Booking now succeeds on restored profile
    const allowedRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        dogId,
        checkInAt: nextWeek.toISOString(),
        checkOutAt: nextWeekEnd.toISOString(),
        status: 'UPCOMING'
      });

    expect(allowedRes.status).toBe(201);
    expect(allowedRes.body.success).toBe(true);
  });

  it('Step 9: Verify complete immutable audit trail for all operations', async () => {
    const auditRes = await request(app)
      .get('/api/v1/audit?pageSize=50')
      .set('Authorization', `Bearer ${authToken}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.success).toBe(true);

    const dogLogs = auditRes.body.data.filter(
      (log: any) => log.entity_id === dogId || log.entity_id === bookingId
    );

    const actionTypes = dogLogs.map((l: any) => l.action);

    expect(actionTypes).toContain('DOG_CREATED');
    expect(actionTypes).toContain('BOOKING_CREATED');
    expect(actionTypes).toContain('BOOKING_STATUS_CHANGED');
    expect(actionTypes).toContain('BOOKING_EXTENDED');
    expect(actionTypes).toContain('BOOKING_OUTGOING_CONFIRMED');
    expect(actionTypes).toContain('DOG_ARCHIVED');
    expect(actionTypes).toContain('DOG_RESTORED');
  });

  it('Step 10: Trigger AES-256 encrypted database backup and verify health status', async () => {
    // 1. Trigger backup
    const backupRes = await request(app)
      .post('/api/v1/backups/trigger')
      .set('Authorization', `Bearer ${authToken}`);

    expect(backupRes.status).toBe(200);
    expect(backupRes.body.success).toBe(true);
    expect(backupRes.body.data.backup).toHaveProperty('identifier');
    expect(backupRes.body.data.backup.size).toBeGreaterThan(0);

    // 2. Verify backup health endpoint
    const healthRes = await request(app)
      .get('/api/v1/backups/status')
      .set('Authorization', `Bearer ${authToken}`);

    expect(healthRes.status).toBe(200);
    expect(healthRes.body.success).toBe(true);
    expect(healthRes.body.data.status).toBe('HEALTHY');
    expect(healthRes.body.data.totalSuccessfulBackups).toBeGreaterThanOrEqual(1);
    expect(healthRes.body.data.lastBackup).toBeDefined();
  });
});
