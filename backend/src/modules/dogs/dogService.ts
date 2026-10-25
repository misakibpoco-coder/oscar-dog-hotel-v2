import { query, withTransaction } from '../../database/index.js';
import { OwnerService } from '../owners/ownerService.js';
import { StatusService } from '../status/statusService.js';
import { normalizePhone } from '../../utils/phone.js';
import { AppError } from '../../errors/appError.js';
import { ErrorCodes } from '../../errors/errorCodes.js';
import { AuditService } from '../audit/auditService.js';
import { toHotelLocalTime, calculateStayDuration } from '../../utils/timezone.js';

export interface CreateDogDTO {
  name: string;
  breed: string;
  dateOfBirth?: string;
  gender: 'Male' | 'Female' | 'Other';
  weightKg?: number | null;
  avatarId: string;
  specialNotes?: string | null;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  confirmExistingOwnerId?: string;
  sharedAccountId?: string;
}

export class DogService {
  /**
   * Atomic Dog Profile Creation with Phone-First Owner Resolution
   */
  static async createDog(dto: CreateDogDTO) {
    return await withTransaction(async (client) => {
      // 1. Resolve owner (phone matching & conflict detection)
      const owner = await OwnerService.resolveOwner(
        {
          name: dto.ownerName,
          phone: dto.ownerPhone,
          email: dto.ownerEmail,
          confirmExistingOwnerId: dto.confirmExistingOwnerId,
          sharedAccountId: dto.sharedAccountId
        },
        client
      );

      // 2. Insert dog record
      const dogRes = await client.query(
        `
        INSERT INTO dogs (owner_id, name, breed, date_of_birth, gender, weight_kg, avatar_id, special_notes, is_archived)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE)
        RETURNING *;
        `,
        [
          owner.id,
          dto.name.trim(),
          dto.breed.trim(),
          dto.dateOfBirth || null,
          dto.gender,
          dto.weightKg || null,
          dto.avatarId,
          dto.specialNotes?.trim() || null
        ]
      );

      const dog = dogRes.rows[0];

      // 3. Log audit
      await AuditService.log(
        {
          sharedAccountId: dto.sharedAccountId,
          action: 'DOG_CREATED',
          entityType: 'DOG',
          entityId: dog.id,
          metadata: { name: dog.name, ownerId: owner.id, avatarId: dog.avatar_id }
        },
        client
      );

      return {
        id: dog.id,
        ownerId: dog.owner_id,
        owner_id: dog.owner_id,
        name: dog.name,
        breed: dog.breed,
        dateOfBirth: dog.date_of_birth,
        date_of_birth: dog.date_of_birth,
        gender: dog.gender,
        weightKg: dog.weight_kg ? parseFloat(dog.weight_kg) : null,
        weight_kg: dog.weight_kg ? parseFloat(dog.weight_kg) : null,
        avatarId: dog.avatar_id,
        avatar_id: dog.avatar_id,
        specialNotes: dog.special_notes,
        special_notes: dog.special_notes,
        isArchived: dog.is_archived,
        is_archived: dog.is_archived,
        createdAt: dog.created_at,
        created_at: dog.created_at,
        updatedAt: dog.updated_at,
        updated_at: dog.updated_at,
        owner: {
          id: owner.id,
          name: owner.name,
          phone: owner.normalizedPhone
        }
      };
    });
  }

  /**
   * Fetch Single Dog Details with Relational Owner and Current Relevant Stay
   */
  static async getDogById(id: string) {
    const res = await query(
      `
      SELECT d.*,
             o.name as owner_name,
             o.display_phone as owner_phone,
             o.email as owner_email
      FROM dogs d
      JOIN owners o ON d.owner_id = o.id
      WHERE d.id = $1;
      `,
      [id]
    );

    if (res.rowCount === 0) {
      throw AppError.notFound(`Dog with ID '${id}' not found`, ErrorCodes.DOG_NOT_FOUND);
    }

    const dog = res.rows[0];

    // Fetch current relevant operational booking
    const relevantBooking = await StatusService.getCurrentRelevantBooking(dog.id);

    let bookingSummary = null;
    if (relevantBooking) {
      const checkInLocal = toHotelLocalTime(relevantBooking.check_in_at);
      const checkOutLocal = toHotelLocalTime(relevantBooking.check_out_at);
      const duration = calculateStayDuration(relevantBooking.check_in_at, relevantBooking.check_out_at);

      bookingSummary = {
        id: relevantBooking.id,
        status: relevantBooking.current_status,
        checkInAt: relevantBooking.check_in_at,
        checkOutAt: relevantBooking.check_out_at,
        checkInFormatted: checkInLocal.dateFormatted,
        checkInTimeFormatted: checkInLocal.timeFormatted,
        checkOutFormatted: checkOutLocal.dateFormatted,
        checkOutTimeFormatted: checkOutLocal.timeFormatted,
        durationNights: duration.nights,
        durationLabel: duration.label,
        services: relevantBooking.services,
        notes: relevantBooking.notes,
        attention: relevantBooking.attention
      };
    }

    return {
      id: dog.id,
      name: dog.name,
      breed: dog.breed,
      dateOfBirth: dog.date_of_birth,
      gender: dog.gender,
      weightKg: dog.weight_kg ? parseFloat(dog.weight_kg) : null,
      avatarId: dog.avatar_id,
      specialNotes: dog.special_notes,
      isArchived: dog.is_archived,
      createdAt: dog.created_at,
      updatedAt: dog.updated_at,
      owner: {
        id: dog.owner_id,
        name: dog.owner_name,
        phone: dog.owner_phone,
        email: dog.owner_email
      },
      currentStatus: bookingSummary ? bookingSummary.status : 'No active booking',
      currentBooking: bookingSummary
    };
  }

  /**
   * List Dogs (Requirement 20 & 21):
   * - Default isArchived = false
   * - Search strictly on: Dog Name, Owner Name, Owner Phone (breed, email, notes excluded)
   * - Status filtering based on relevant booking
   */
  static async listDogs(params: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    archived?: string;
  }) {
    const { page, pageSize, search, status, archived } = params;
    const offset = (page - 1) * pageSize;
    const isArchived = archived === 'true';

    const conditions: string[] = ['d.is_archived = $1'];
    const sqlParams: any[] = [isArchived];

    // Search Rule (Requirement 21): Strictly Dog Name, Owner Name, Owner Phone
    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      const normPhone = `%${normalizePhone(search)}%`;
      sqlParams.push(q, normPhone);
      const qIdx = sqlParams.length - 1;
      const phoneIdx = sqlParams.length;

      conditions.push(
        `(LOWER(d.name) LIKE $${qIdx} OR LOWER(o.name) LIKE $${qIdx} OR o.normalized_phone LIKE $${phoneIdx} OR LOWER(o.display_phone) LIKE $${qIdx})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Fetch dogs with owner
    const baseQuery = `
      SELECT d.*,
             o.name as owner_name,
             o.display_phone as owner_phone,
             o.email as owner_email
      FROM dogs d
      JOIN owners o ON d.owner_id = o.id
      ${whereClause}
      ORDER BY d.created_at DESC
    `;

    const allDogsRes = await query(baseQuery, sqlParams);
    const now = new Date();

    // Attach relevant booking and status to each dog
    const dogsWithStatus = await Promise.all(
      allDogsRes.rows.map(async (dog) => {
        const relevant = await StatusService.getCurrentRelevantBooking(dog.id, now);
        let currentStatus = 'No active booking';
        let bookingInfo = null;

        if (relevant) {
          currentStatus = relevant.current_status;
          const inLocal = toHotelLocalTime(relevant.check_in_at);
          const outLocal = toHotelLocalTime(relevant.check_out_at);
          const dur = calculateStayDuration(relevant.check_in_at, relevant.check_out_at);

          bookingInfo = {
            id: relevant.id,
            status: relevant.current_status,
            checkInAt: relevant.check_in_at,
            checkOutAt: relevant.check_out_at,
            checkInFormatted: inLocal.dateFormatted,
            checkInTimeFormatted: inLocal.timeFormatted,
            checkOutFormatted: outLocal.dateFormatted,
            checkOutTimeFormatted: outLocal.timeFormatted,
            durationNights: dur.nights,
            durationLabel: dur.label,
            attention: relevant.attention
          };
        }

        return {
          id: dog.id,
          name: dog.name,
          breed: dog.breed,
          dateOfBirth: dog.date_of_birth,
          gender: dog.gender,
          weightKg: dog.weight_kg ? parseFloat(dog.weight_kg) : null,
          avatarId: dog.avatar_id,
          specialNotes: dog.special_notes,
          isArchived: dog.is_archived,
          createdAt: dog.created_at,
          updatedAt: dog.updated_at,
          owner: {
            id: dog.owner_id,
            name: dog.owner_name,
            phone: dog.owner_phone,
            email: dog.owner_email
          },
          currentStatus,
          currentBooking: bookingInfo
        };
      })
    );

    // Apply Status Filter if provided
    let finalItems = dogsWithStatus;
    if (status && status.toUpperCase() !== 'ALL') {
      const targetStatus = status.toUpperCase().replace(/\s+/g, '_');
      finalItems = finalItems.filter((d) => d.currentStatus === targetStatus);
    }

    const total = finalItems.length;
    const paginated = finalItems.slice(offset, offset + pageSize);

    return {
      items: paginated,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * Update Dog Details
   */
  static async updateDog(id: string, updates: any, sharedAccountId?: string) {
    const existing = await query('SELECT * FROM dogs WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      throw AppError.notFound(`Dog with ID '${id}' not found`, ErrorCodes.DOG_NOT_FOUND);
    }

    const current = existing.rows[0];
    const name = updates.name !== undefined ? updates.name.trim() : current.name;
    const breed = updates.breed !== undefined ? updates.breed.trim() : current.breed;
    const dateOfBirth = updates.dateOfBirth !== undefined ? (updates.dateOfBirth || null) : current.date_of_birth;
    const gender = updates.gender !== undefined ? updates.gender : current.gender;
    const weightKg = updates.weightKg !== undefined ? (updates.weightKg || null) : current.weight_kg;
    const avatarId = updates.avatarId !== undefined ? updates.avatarId : current.avatar_id;
    const specialNotes = updates.specialNotes !== undefined ? (updates.specialNotes || null) : current.special_notes;
    const ownerId = updates.ownerId !== undefined ? updates.ownerId : current.owner_id;

    const res = await query(
      `
      UPDATE dogs
      SET name = $1, breed = $2, date_of_birth = $3, gender = $4, weight_kg = $5, avatar_id = $6, special_notes = $7, owner_id = $8, updated_at = NOW()
      WHERE id = $9
      RETURNING *;
      `,
      [name, breed, dateOfBirth, gender, weightKg, avatarId, specialNotes, ownerId, id]
    );

    await AuditService.log({
      sharedAccountId,
      action: 'DOG_UPDATED',
      entityType: 'DOG',
      entityId: id,
      metadata: updates
    });

    return res.rows[0];
  }

  /**
   * Archive Dog Profile (Requirement 18 & 19)
   * Soft archive: keeps all records, owner relationships, bookings, status history.
   * Disappears from normal active dogs view, blocked from receiving new bookings.
   */
  static async archiveDog(id: string, sharedAccountId?: string) {
    const res = await query(
      `
      UPDATE dogs
      SET is_archived = TRUE, updated_at = NOW()
      WHERE id = $1
      RETURNING *;
      `,
      [id]
    );

    if (res.rowCount === 0) {
      throw AppError.notFound(`Dog with ID '${id}' not found`, ErrorCodes.DOG_NOT_FOUND);
    }

    await AuditService.log({
      sharedAccountId,
      action: 'DOG_ARCHIVED',
      entityType: 'DOG',
      entityId: id
    });

    return {
      success: true,
      message: `Dog '${res.rows[0].name}' archived successfully`,
      isArchived: true,
      dog: {
        ...res.rows[0],
        avatarId: res.rows[0].avatar_id,
        isArchived: true
      }
    };
  }

  /**
   * Restore Archived Dog Profile
   */
  static async restoreDog(id: string, sharedAccountId?: string) {
    const res = await query(
      `
      UPDATE dogs
      SET is_archived = FALSE, updated_at = NOW()
      WHERE id = $1
      RETURNING *;
      `,
      [id]
    );

    if (res.rowCount === 0) {
      throw AppError.notFound(`Dog with ID '${id}' not found`, ErrorCodes.DOG_NOT_FOUND);
    }

    await AuditService.log({
      sharedAccountId,
      action: 'DOG_RESTORED',
      entityType: 'DOG',
      entityId: id
    });

    return {
      success: true,
      message: `Dog '${res.rows[0].name}' restored successfully`,
      isArchived: false,
      dog: {
        ...res.rows[0],
        avatarId: res.rows[0].avatar_id,
        isArchived: false
      }
    };
  }
}
