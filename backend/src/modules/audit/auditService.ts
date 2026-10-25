import { pool, query } from '../../database/index.js';
import pg from 'pg';

export interface AuditLogEntry {
  sharedAccountId?: string | null;
  action: string;
  entityType: 'DOG' | 'BOOKING' | 'OWNER' | 'STATUS' | 'SETTINGS' | 'AUTH' | 'SYSTEM';
  entityId?: string;
  metadata?: Record<string, any>;
}

export class AuditService {
  /**
   * Log an operational mutation (can run inside an existing transaction client or pool)
   */
  static async log(entry: AuditLogEntry, client?: pg.PoolClient): Promise<void> {
    const q = `
      INSERT INTO audit_logs (shared_account_id, action, entity_type, entity_id, metadata)
      VALUES ($1, $2, $3, $4, $5);
    `;
    const params = [
      entry.sharedAccountId || null,
      entry.action,
      entry.entityType,
      entry.entityId || null,
      JSON.stringify(entry.metadata || {})
    ];

    if (client) {
      await client.query(q, params);
    } else {
      await query(q, params);
    }
  }

  static async listLogs(page: number = 1, pageSize: number = 25) {
    const offset = (page - 1) * pageSize;
    const countRes = await query('SELECT COUNT(*) as total FROM audit_logs');
    const total = parseInt(countRes.rows[0].total, 10);

    const logsRes = await query(
      `
      SELECT al.*, sa.email as account_email, sa.display_name as account_display_name
      FROM audit_logs al
      LEFT JOIN shared_accounts sa ON al.shared_account_id = sa.id
      ORDER BY al.created_at DESC
      LIMIT $1 OFFSET $2;
      `,
      [pageSize, offset]
    );

    return {
      items: logsRes.rows,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }
}
