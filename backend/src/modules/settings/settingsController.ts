import { Request, Response, NextFunction } from 'express';
import { query } from '../../database/index.js';
import { AuditService } from '../audit/auditService.js';

export class SettingsController {
  static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const appSettingsRes = await query('SELECT * FROM application_settings WHERE id = $1', ['default']);
      const accountRes = req.user
        ? await query('SELECT id, email, display_name, avatar_url FROM shared_accounts WHERE id = $1', [req.user.sharedAccountId])
        : { rows: [] };

      const appSettings = appSettingsRes.rows[0] || {
        hotel_timezone: 'Europe/Nicosia',
        version: '1.0.0',
        build: '20260913',
        environment: 'Production'
      };

      const account = accountRes.rows[0] || {};

      res.status(200).json({
        success: true,
        data: {
          account: {
            id: account.id,
            email: account.email,
            displayName: account.display_name,
            avatarUrl: account.avatar_url
          },
          system: {
            hotelTimezone: appSettings.hotel_timezone,
            version: appSettings.version,
            build: appSettings.build,
            environment: appSettings.environment,
            updatedAt: appSettings.updated_at
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { displayName, avatarUrl, hotelTimezone } = req.body;

      if (req.user && (displayName !== undefined || avatarUrl !== undefined)) {
        await query(
          `
          UPDATE shared_accounts
          SET display_name = COALESCE($1, display_name),
              avatar_url = COALESCE($2, avatar_url),
              updated_at = NOW()
          WHERE id = $3;
          `,
          [displayName?.trim() || null, avatarUrl?.trim() || null, req.user.sharedAccountId]
        );
      }

      if (hotelTimezone) {
        await query(
          `
          UPDATE application_settings
          SET hotel_timezone = $1, updated_at = NOW()
          WHERE id = 'default';
          `,
          [hotelTimezone.trim()]
        );
      }

      await AuditService.log({
        sharedAccountId: req.user?.sharedAccountId,
        action: 'SETTINGS_UPDATED',
        entityType: 'SETTINGS',
        entityId: 'default',
        metadata: { displayName, avatarUrl, hotelTimezone }
      });

      return SettingsController.getSettings(req, res, next);
    } catch (err) {
      next(err);
    }
  }

  static async exportData(req: Request, res: Response, next: NextFunction) {
    try {
      const dogsRes = await query('SELECT * FROM dogs ORDER BY created_at ASC');
      const ownersRes = await query('SELECT * FROM owners ORDER BY created_at ASC');
      const bookingsRes = await query('SELECT * FROM bookings ORDER BY created_at ASC');
      const historyRes = await query('SELECT * FROM status_history ORDER BY effective_at ASC');
      const settingsRes = await query('SELECT * FROM application_settings');

      const backupData = {
        meta: {
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
          generator: 'Oscar Dog Hotel Management API'
        },
        owners: ownersRes.rows,
        dogs: dogsRes.rows,
        bookings: bookingsRes.rows,
        statusHistory: historyRes.rows,
        settings: settingsRes.rows[0]
      };

      await AuditService.log({
        sharedAccountId: req.user?.sharedAccountId,
        action: 'DATA_EXPORT',
        entityType: 'SYSTEM',
        entityId: 'full_backup'
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="oscar_dog_hotel_backup_${new Date().toISOString().split('T')[0]}.json"`);
      res.status(200).json(backupData);
    } catch (err) {
      next(err);
    }
  }
}
