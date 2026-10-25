import { query, pool } from '../../database/index.js';
import pg from 'pg';
import { normalizePhone, formatDisplayPhone } from '../../utils/phone.js';
import { AppError } from '../../errors/appError.js';
import { ErrorCodes } from '../../errors/errorCodes.js';
import { AuditService } from '../audit/auditService.js';

export interface ResolveOwnerParams {
  name: string;
  phone: string;
  email?: string;
  confirmExistingOwnerId?: string;
  sharedAccountId?: string;
}

export class OwnerService {
  /**
   * Phone-First Owner Matching Rule with Name Conflict Detection
   */
  static async resolveOwner(params: ResolveOwnerParams, client?: pg.PoolClient): Promise<{ id: string; name: string; normalizedPhone: string; isNew: boolean }> {
    const { name, phone, email, confirmExistingOwnerId, sharedAccountId } = params;
    const normalizedPhone = normalizePhone(phone);
    const displayPhone = formatDisplayPhone(normalizedPhone);

    const execQuery = client ? client.query.bind(client) : query;

    // 1. Search owner by normalized phone
    const existingRes = await execQuery(
      'SELECT * FROM owners WHERE normalized_phone = $1',
      [normalizedPhone]
    );

    if (existingRes.rowCount && existingRes.rowCount > 0) {
      const inputNameClean = name.trim().toLowerCase();

      // Check if staff explicitly confirmed a specific existing owner
      if (confirmExistingOwnerId) {
        const confirmed = existingRes.rows.find((r: any) => r.id === confirmExistingOwnerId);
        if (confirmed) {
          return {
            id: confirmed.id,
            name: confirmed.name,
            normalizedPhone: confirmed.normalized_phone,
            isNew: false
          };
        }
      }

      // Check if there is an exact name match among owners sharing this phone
      const exactMatch = existingRes.rows.find(
        (r: any) => r.name.trim().toLowerCase() === inputNameClean
      );

      if (exactMatch) {
        return {
          id: exactMatch.id,
          name: exactMatch.name,
          normalizedPhone: exactMatch.normalized_phone,
          isNew: false
        };
      }
      // If name does not match, allow creating a new owner record with the same phone number
    }

    // 2. Create new owner record
    const insertRes = await execQuery(
      `
      INSERT INTO owners (name, normalized_phone, display_phone, email)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, normalized_phone;
      `,
      [name.trim(), normalizedPhone, displayPhone, email?.trim() || null]
    );

    const newOwner = insertRes.rows[0];

    await AuditService.log(
      {
        sharedAccountId,
        action: 'OWNER_CREATED',
        entityType: 'OWNER',
        entityId: newOwner.id,
        metadata: { name: newOwner.name, phone: normalizedPhone }
      },
      client
    );

    return {
      id: newOwner.id,
      name: newOwner.name,
      normalizedPhone: newOwner.normalized_phone,
      isNew: true
    };
  }

  static async getOwnerById(id: string) {
    const res = await query(
      `
      SELECT o.*,
        json_agg(
          json_build_object(
            'id', d.id,
            'name', d.name,
            'breed', d.breed,
            'avatarId', d.avatar_id,
            'isArchived', d.is_archived
          )
        ) FILTER (WHERE d.id IS NOT NULL) as dogs
      FROM owners o
      LEFT JOIN dogs d ON d.owner_id = o.id
      WHERE o.id = $1
      GROUP BY o.id;
      `,
      [id]
    );

    if (res.rowCount === 0) {
      throw AppError.notFound(`Owner with ID '${id}' not found`, ErrorCodes.OWNER_NOT_FOUND);
    }

    const row = res.rows[0];
    return {
      ...row,
      dogs: row.dogs || []
    };
  }

  static async listOwners(page: number = 1, pageSize: number = 25, search?: string) {
    const offset = (page - 1) * pageSize;
    let whereClause = '';
    const params: any[] = [];

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      const norm = `%${normalizePhone(search)}%`;
      params.push(q, norm);
      whereClause = 'WHERE LOWER(name) LIKE $1 OR normalized_phone LIKE $2';
    }

    const countRes = await query(`SELECT COUNT(*) as total FROM owners ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].total, 10);

    const queryParams = [...params, pageSize, offset];
    const ownersRes = await query(
      `
      SELECT o.*, COUNT(d.id)::int as dogs_count
      FROM owners o
      LEFT JOIN dogs d ON d.owner_id = o.id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
      `,
      queryParams
    );

    return {
      items: ownersRes.rows,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  static async updateOwner(id: string, updates: { name?: string; phone?: string; email?: string }, sharedAccountId?: string) {
    const existing = await query('SELECT * FROM owners WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      throw AppError.notFound('Owner not found', ErrorCodes.OWNER_NOT_FOUND);
    }

    const name = updates.name !== undefined ? updates.name.trim() : existing.rows[0].name;
    let normalizedPhone = existing.rows[0].normalized_phone;
    let displayPhone = existing.rows[0].display_phone;

    if (updates.phone) {
      normalizedPhone = normalizePhone(updates.phone);
      displayPhone = formatDisplayPhone(normalizedPhone);
    }

    const email = updates.email !== undefined ? (updates.email.trim() || null) : existing.rows[0].email;

    const res = await query(
      `
      UPDATE owners
      SET name = $1, normalized_phone = $2, display_phone = $3, email = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *;
      `,
      [name, normalizedPhone, displayPhone, email, id]
    );

    await AuditService.log({
      sharedAccountId,
      action: 'OWNER_UPDATED',
      entityType: 'OWNER',
      entityId: id,
      metadata: updates
    });

    return res.rows[0];
  }
}
