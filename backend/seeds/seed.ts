import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// V2 safety guard: never run against the legacy V1 Supabase project.
if ((process.env.DATABASE_URL || '').includes('steadtxkidcyqebxtmvf')) {
  console.error('Refusing to run: DATABASE_URL points at the legacy V1 Supabase project.');
  process.exit(1);
}


const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/oscar_dog_hotel';

async function seedDatabase() {
  console.log('Starting seed process...');
  const isCloudDb = databaseUrl.includes('render.com') || databaseUrl.includes('sslmode=require') || process.env.NODE_ENV === 'production';
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: isCloudDb ? { rejectUnauthorized: false } : undefined
  });

  try {
    await client.connect();
    await client.query('BEGIN');

    // 1. Create or update Default Shared Account
    console.log('Seeding shared staff account...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('OscarHotel2026!', salt);

    const accountRes = await client.query(
      `
      INSERT INTO shared_accounts (email, password_hash, display_name, avatar_url)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash, display_name = EXCLUDED.display_name
      RETURNING id;
      `,
      ['admin@oscardoghotel.com', passwordHash, 'MD Sakib', '/assets/user_avatar.png']
    );
    const sharedAccountId = accountRes.rows[0].id;

    // 2. Application Settings
    console.log('Seeding application settings...');
    await client.query(
      `
      INSERT INTO application_settings (id, hotel_timezone, version, build, environment)
      VALUES ('default', 'Europe/Nicosia', '1.0.0', '20260913', 'Production')
      ON CONFLICT (id) DO UPDATE
      SET hotel_timezone = EXCLUDED.hotel_timezone,
          version = EXCLUDED.version,
          build = EXCLUDED.build,
          environment = EXCLUDED.environment,
          updated_at = NOW();
      `
    );

    // 3. Owners (with normalized phones)
    console.log('Seeding owners...');
    const ownersData = [
      { name: 'John Miller', normalizedPhone: '+35799123456', displayPhone: '+357 99 123456', email: 'john.miller@example.com' },
      { name: 'Sarah Johnson', normalizedPhone: '+35796654321', displayPhone: '+357 96 654321', email: 'sarah.j@example.com' },
      { name: 'David Brown', normalizedPhone: '+35797112233', displayPhone: '+357 97 112233', email: 'david.b@example.com' },
      { name: 'Michael Davis', normalizedPhone: '+35795667788', displayPhone: '+357 95 667788', email: 'michael.d@example.com' },
      { name: 'Emily Wilson', normalizedPhone: '+35799889900', displayPhone: '+357 99 889900', email: 'emily.w@example.com' },
      { name: 'Daniel Lee', normalizedPhone: '+35796445566', displayPhone: '+357 96 445566', email: 'daniel.l@example.com' }
    ];

    const ownerIds: Record<string, string> = {};

    for (const o of ownersData) {
      const res = await client.query(
        `
        INSERT INTO owners (name, normalized_phone, display_phone, email)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (normalized_phone) DO UPDATE
        SET name = EXCLUDED.name, email = EXCLUDED.email, updated_at = NOW()
        RETURNING id;
        `,
        [o.name, o.normalizedPhone, o.displayPhone, o.email]
      );
      ownerIds[o.normalizedPhone] = res.rows[0].id;
    }

    // 4. Dogs (using the 5 universal avatars)
    console.log('Seeding dogs...');
    const dogsData = [
      // 1. Bruno (avatar_1, Golden)
      {
        name: 'Bruno',
        ownerPhone: '+35799123456',
        breed: 'Golden Retriever',
        dob: '2023-05-10',
        gender: 'Male',
        weight: 28.0,
        avatarId: 'avatar_1',
        notes: 'Friendly golden, loves garden fetch. Dry food 2x daily.',
        isArchived: false
      },
      // 2. Luna (avatar_2, Beagle)
      {
        name: 'Luna',
        ownerPhone: '+35796654321',
        breed: 'Beagle',
        dob: '2023-08-15',
        gender: 'Female',
        weight: 12.5,
        avatarId: 'avatar_2',
        notes: 'Gentle beagle, sensitive stomach kibble provided.',
        isArchived: false
      },
      // 3. Max (avatar_3, Labrador)
      {
        name: 'Max',
        ownerPhone: '+35797112233',
        breed: 'Labrador Retriever',
        dob: '2025-02-01',
        gender: 'Male',
        weight: 25.0,
        avatarId: 'avatar_3',
        notes: 'High energy puppy. Loves water and ball games.',
        isArchived: false
      },
      // 4. Buddy (avatar_4, Shih Tzu)
      {
        name: 'Buddy',
        ownerPhone: '+35795667788',
        breed: 'Shih Tzu',
        dob: '2022-11-20',
        gender: 'Male',
        weight: 8.0,
        avatarId: 'avatar_4',
        notes: 'Calm and quiet lap dog.',
        isArchived: false
      },
      // 5. Bella (avatar_5, Yorkie)
      {
        name: 'Bella',
        ownerPhone: '+35799889900',
        breed: 'Yorkshire Terrier',
        dob: '2024-04-12',
        gender: 'Female',
        weight: 6.0,
        avatarId: 'avatar_5',
        notes: 'Prefers small indoor suites.',
        isArchived: false
      },
      // 6. Rocky (avatar_1, Husky) - Complete stay
      {
        name: 'Rocky',
        ownerPhone: '+35796445566',
        breed: 'Siberian Husky',
        dob: '2023-01-10',
        gender: 'Male',
        weight: 22.0,
        avatarId: 'avatar_1',
        notes: 'Vocal husky, regular brushing needed.',
        isArchived: false
      },
      // 7. Daisy (avatar_2, Cocker Spaniel) - In Hotel
      {
        name: 'Daisy',
        ownerPhone: '+35799123456', // Same owner as Bruno!
        breed: 'Cocker Spaniel',
        dob: '2024-06-01',
        gender: 'Female',
        weight: 14.0,
        avatarId: 'avatar_2',
        notes: 'Bruno sibling, stays together.',
        isArchived: false
      },
      // 8. Milo (avatar_3, Frenchie) - Received
      {
        name: 'Milo',
        ownerPhone: '+35797112233', // Same owner as Max!
        breed: 'French Bulldog',
        dob: '2024-09-01',
        gender: 'Male',
        weight: 11.0,
        avatarId: 'avatar_3',
        notes: 'Air conditioned room mandatory.',
        isArchived: false
      },
      // 9. Cooper (avatar_4, Poodle) - Multiple future bookings
      {
        name: 'Cooper',
        ownerPhone: '+35795667788',
        breed: 'Poodle',
        dob: '2021-03-14',
        gender: 'Male',
        weight: 9.0,
        avatarId: 'avatar_4',
        notes: 'Grooming on arrival.',
        isArchived: false
      },
      // 10. Bailey (avatar_5, Pomeranian) - No active booking dog!
      {
        name: 'Bailey',
        ownerPhone: '+35799889900',
        breed: 'Pomeranian',
        dob: '2025-01-10',
        gender: 'Female',
        weight: 4.0,
        avatarId: 'avatar_5',
        notes: 'Has past bookings, no current active booking.',
        isArchived: false
      },
      // 11. Buster (avatar_3) - ARCHIVED dog
      {
        name: 'Buster',
        ownerPhone: '+35796445566',
        breed: 'Boxer',
        dob: '2020-07-22',
        gender: 'Male',
        weight: 30.0,
        avatarId: 'avatar_3',
        notes: 'Archived profile. Relocated to another city.',
        isArchived: true
      }
    ];

    const dogIds: Record<string, string> = {};

    for (const d of dogsData) {
      const ownerId = ownerIds[d.ownerPhone];
      // Check if dog exists
      const existing = await client.query(
        'SELECT id FROM dogs WHERE owner_id = $1 AND name = $2',
        [ownerId, d.name]
      );

      let dogId = existing.rows[0]?.id;
      if (!dogId) {
        const res = await client.query(
          `
          INSERT INTO dogs (owner_id, name, breed, date_of_birth, gender, weight_kg, avatar_id, special_notes, is_archived)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id;
          `,
          [ownerId, d.name, d.breed, d.dob, d.gender, d.weight, d.avatarId, d.notes, d.isArchived]
        );
        dogId = res.rows[0].id;
      }
      dogIds[d.name] = dogId;
    }

    // 5. Bookings covering all 6 statuses and edge cases
    console.log('Seeding bookings and status history...');
    const now = new Date('2026-09-14T11:00:00Z');

    const bookingsData = [
      // Bruno: IN_HOTEL
      {
        dogName: 'Bruno',
        checkInAt: '2026-09-12T07:15:00Z', // 10:15 AM EEST
        checkOutAt: '2026-09-15T07:00:00Z', // 10:00 AM EEST
        status: 'IN_HOTEL',
        services: ['bathing', 'extra_walks'],
        notes: 'Enjoys morning walks',
        isOutgoingConfirmed: false,
        history: [
          { prev: null, next: 'RECEIVED', eff: '2026-09-12T07:15:00Z', note: 'Registered on arrival' },
          { prev: 'RECEIVED', next: 'IN_HOTEL', eff: '2026-09-12T07:30:00Z', note: 'Settled in suite' }
        ]
      },
      // Luna: UPCOMING
      {
        dogName: 'Luna',
        checkInAt: '2026-09-15T08:00:00Z',
        checkOutAt: '2026-09-18T09:00:00Z',
        status: 'UPCOMING',
        services: ['special_food'],
        notes: 'Diet kibble supplied',
        isOutgoingConfirmed: false,
        history: [
          { prev: null, next: 'UPCOMING', eff: '2026-09-15T08:00:00Z', note: 'Online booking created' }
        ]
      },
      // Max: OUTGOING (Past checkout time! Demonstrates attention alert)
      {
        dogName: 'Max',
        checkInAt: '2026-09-10T06:00:00Z',
        checkOutAt: '2026-09-14T10:30:00Z', // 1:30 PM EEST - earlier today, now overdue!
        status: 'OUTGOING',
        services: ['training', 'extra_walks'],
        notes: 'Owner picking up afternoon',
        isOutgoingConfirmed: false, // Unconfirmed -> Triggers Action Required alert!
        history: [
          { prev: null, next: 'RECEIVED', eff: '2026-09-10T06:00:00Z', note: 'Arrived' },
          { prev: 'RECEIVED', next: 'IN_HOTEL', eff: '2026-09-10T06:30:00Z', note: 'Active stay' },
          { prev: 'IN_HOTEL', next: 'OUTGOING', eff: '2026-09-14T10:30:00Z', note: 'Checkout due' }
        ]
      },
      // Buddy: CANCEL
      {
        dogName: 'Buddy',
        checkInAt: '2026-09-12T11:00:00Z',
        checkOutAt: '2026-09-12T15:00:00Z',
        status: 'CANCEL',
        services: [],
        notes: 'Owner cancelled travel plan',
        isOutgoingConfirmed: false,
        history: [
          { prev: null, next: 'UPCOMING', eff: '2026-09-12T11:00:00Z', note: 'Reserved' },
          { prev: 'UPCOMING', next: 'CANCEL', eff: '2026-09-12T10:00:00Z', note: 'Cancelled via phone' }
        ]
      },
      // Bella: RECEIVED
      {
        dogName: 'Bella',
        checkInAt: '2026-09-14T12:20:00Z', // Today 3:20 PM EEST
        checkOutAt: '2026-09-16T07:00:00Z',
        status: 'RECEIVED',
        services: ['grooming'],
        notes: 'Just arrived at front desk',
        isOutgoingConfirmed: false,
        history: [
          { prev: null, next: 'RECEIVED', eff: '2026-09-14T12:20:00Z', note: 'Intake in progress' }
        ]
      },
      // Rocky: COMPLETE (Historical completed stay)
      {
        dogName: 'Rocky',
        checkInAt: '2026-09-05T06:00:00Z',
        checkOutAt: '2026-09-10T08:00:00Z',
        status: 'COMPLETE',
        services: ['bathing', 'training'],
        notes: 'Successfully completed stay',
        isOutgoingConfirmed: true,
        history: [
          { prev: null, next: 'IN_HOTEL', eff: '2026-09-05T06:00:00Z', note: 'Checked in' },
          { prev: 'IN_HOTEL', next: 'OUTGOING', eff: '2026-09-10T07:30:00Z', note: 'Departure prep' },
          { prev: 'OUTGOING', next: 'COMPLETE', eff: '2026-09-10T08:00:00Z', note: 'Departed' }
        ]
      },
      // Daisy: IN_HOTEL
      {
        dogName: 'Daisy',
        checkInAt: '2026-09-11T05:30:00Z',
        checkOutAt: '2026-09-16T07:00:00Z',
        status: 'IN_HOTEL',
        services: ['grooming', 'extra_walks'],
        notes: 'Sharing suite with Bruno',
        isOutgoingConfirmed: false,
        history: [
          { prev: null, next: 'IN_HOTEL', eff: '2026-09-11T05:30:00Z', note: 'Checked in' }
        ]
      },
      // Milo: RECEIVED
      {
        dogName: 'Milo',
        checkInAt: '2026-09-14T06:15:00Z',
        checkOutAt: '2026-09-17T14:00:00Z',
        status: 'RECEIVED',
        services: ['medication'],
        notes: 'Ear drops at 12 PM',
        isOutgoingConfirmed: false,
        history: [
          { prev: null, next: 'RECEIVED', eff: '2026-09-14T06:15:00Z', note: 'Morning check-in' }
        ]
      },
      // Cooper: Booking 1 (Upcoming nearest: Sep 20-23)
      {
        dogName: 'Cooper',
        checkInAt: '2026-09-20T07:00:00Z',
        checkOutAt: '2026-09-23T14:00:00Z',
        status: 'UPCOMING',
        services: ['grooming'],
        notes: 'Primary upcoming stay',
        isOutgoingConfirmed: false,
        history: [
          { prev: null, next: 'UPCOMING', eff: '2026-09-20T07:00:00Z', note: 'Booked' }
        ]
      },
      // Cooper: Booking 2 (Future subsequent: Oct 05-08 - demonstrates multiple future stays)
      {
        dogName: 'Cooper',
        checkInAt: '2026-10-05T07:00:00Z',
        checkOutAt: '2026-10-08T14:00:00Z',
        status: 'UPCOMING',
        services: ['extra_walks'],
        notes: 'Subsequent planned holiday stay',
        isOutgoingConfirmed: false,
        history: [
          { prev: null, next: 'UPCOMING', eff: '2026-10-05T07:00:00Z', note: 'Booked' }
        ]
      },
      // Bailey: Historical completed booking only (Now has "No active booking")
      {
        dogName: 'Bailey',
        checkInAt: '2026-08-10T07:00:00Z',
        checkOutAt: '2026-08-15T09:00:00Z',
        status: 'COMPLETE',
        services: ['extra_walks'],
        notes: 'Past stay. No current or upcoming stays.',
        isOutgoingConfirmed: true,
        history: [
          { prev: 'IN_HOTEL', next: 'COMPLETE', eff: '2026-08-15T09:00:00Z', note: 'Checked out' }
        ]
      },
      // Buster: Archived dog historical booking
      {
        dogName: 'Buster',
        checkInAt: '2025-06-01T07:00:00Z',
        checkOutAt: '2025-06-10T09:00:00Z',
        status: 'COMPLETE',
        services: ['training'],
        notes: 'Historical stay for archived dog',
        isOutgoingConfirmed: true,
        history: [
          { prev: 'IN_HOTEL', next: 'COMPLETE', eff: '2025-06-10T09:00:00Z', note: 'Completed' }
        ]
      }
    ];

    for (const b of bookingsData) {
      const dogId = dogIds[b.dogName];
      const res = await client.query(
        `
        INSERT INTO bookings (dog_id, check_in_at, check_out_at, current_status, services, notes, is_outgoing_confirmed)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id;
        `,
        [dogId, b.checkInAt, b.checkOutAt, b.status, JSON.stringify(b.services), b.notes, b.isOutgoingConfirmed]
      );
      const bookingId = res.rows[0].id;

      for (const h of b.history) {
        await client.query(
          `
          INSERT INTO status_history (booking_id, previous_status, new_status, effective_at, changed_at, shared_account_id, notes)
          VALUES ($1, $2, $3, $4, NOW(), $5, $6);
          `,
          [bookingId, h.prev, h.next, h.eff, sharedAccountId, h.note]
        );
      }
    }

    // 6. Initial Audit Log
    console.log('Seeding initial audit logs...');
    await client.query(
      `
      INSERT INTO audit_logs (shared_account_id, action, entity_type, entity_id, metadata)
      VALUES ($1, 'DATABASE_SEED', 'SYSTEM', 'root', '{"message": "Development database seeded successfully"}'::jsonb);
      `,
      [sharedAccountId]
    );

    await client.query('COMMIT');
    console.log('Database seeded successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during database seed:', err);
    throw err;
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase().catch((err) => {
    console.error('Seed script failed:', err);
    process.exit(1);
  });
}

export { seedDatabase };
