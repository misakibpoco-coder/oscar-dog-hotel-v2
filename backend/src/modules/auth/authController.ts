import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../database/index.js';
import { config } from '../../config/index.js';
import { AppError } from '../../errors/appError.js';
import { ErrorCodes } from '../../errors/errorCodes.js';
import { AuditService } from '../audit/auditService.js';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      // 1. Fetch shared account by email
      const accountRes = await query(
        'SELECT * FROM shared_accounts WHERE email = $1',
        [email.toLowerCase().trim()]
      );

      if (accountRes.rowCount === 0) {
        throw AppError.unauthorized('Invalid email or password');
      }

      const account = accountRes.rows[0];

      // 2. Verify password with bcrypt
      const isMatch = await bcrypt.compare(password, account.password_hash);
      if (!isMatch) {
        throw AppError.unauthorized('Invalid email or password');
      }

      // 3. Update last login
      await query('UPDATE shared_accounts SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [account.id]);

      // 4. Generate tokens
      const accessToken = jwt.sign(
        {
          sub: account.id,
          email: account.email,
          displayName: account.display_name
        },
        config.jwt.secret,
        { expiresIn: config.jwt.accessExpiresIn as any }
      );

      const refreshToken = jwt.sign(
        { sub: account.id },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn as any }
      );

      // 5. Audit login
      await AuditService.log({
        sharedAccountId: account.id,
        action: 'STAFF_LOGIN',
        entityType: 'AUTH',
        entityId: account.id,
        metadata: { email: account.email }
      });

      res.status(200).json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          expiresIn: config.jwt.accessExpiresIn,
          account: {
            id: account.id,
            email: account.email,
            displayName: account.display_name,
            avatarUrl: account.avatar_url,
            lastLoginAt: account.last_login_at
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      let payload: any;
      try {
        payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
      } catch (err) {
        throw new AppError(401, ErrorCodes.AUTH_INVALID, 'Invalid or expired refresh token');
      }

      const accountRes = await query('SELECT * FROM shared_accounts WHERE id = $1', [payload.sub]);
      if (accountRes.rowCount === 0) {
        throw AppError.unauthorized('Account not found');
      }

      const account = accountRes.rows[0];

      const newAccessToken = jwt.sign(
        {
          sub: account.id,
          email: account.email,
          displayName: account.display_name
        },
        config.jwt.secret,
        { expiresIn: config.jwt.accessExpiresIn as any }
      );

      res.status(200).json({
        success: true,
        data: {
          accessToken: newAccessToken,
          expiresIn: config.jwt.accessExpiresIn
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user) {
        await AuditService.log({
          sharedAccountId: req.user.sharedAccountId,
          action: 'STAFF_LOGOUT',
          entityType: 'AUTH',
          entityId: req.user.sharedAccountId
        });
      }

      res.status(200).json({
        success: true,
        data: { message: 'Logged out successfully' }
      });
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const accountRes = await query('SELECT id, email FROM shared_accounts WHERE email = $1', [email.toLowerCase().trim()]);

      // Always return success to prevent email enumeration
      let resetToken = undefined;
      if (accountRes.rowCount && accountRes.rowCount > 0) {
        resetToken = jwt.sign(
          { sub: accountRes.rows[0].id, purpose: 'password_reset' },
          config.jwt.secret,
          { expiresIn: '1h' }
        );
      }

      res.status(200).json({
        success: true,
        data: {
          message: 'If the account exists, a password reset token has been issued.',
          // Provided in development response for easy testing
          ...(config.nodeEnv === 'development' && resetToken ? { devResetToken: resetToken } : {})
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;

      let payload: any;
      try {
        payload = jwt.verify(token, config.jwt.secret);
      } catch {
        throw AppError.badRequest('Invalid or expired reset token', ErrorCodes.AUTH_INVALID);
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      await query(
        'UPDATE shared_accounts SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, payload.sub]
      );

      await AuditService.log({
        sharedAccountId: payload.sub,
        action: 'PASSWORD_RESET',
        entityType: 'AUTH',
        entityId: payload.sub
      });

      res.status(200).json({
        success: true,
        data: { message: 'Password has been updated successfully.' }
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAccount(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw AppError.unauthorized();

      const accountRes = await query(
        'SELECT id, email, display_name, avatar_url, last_login_at, created_at FROM shared_accounts WHERE id = $1',
        [req.user.sharedAccountId]
      );

      if (accountRes.rowCount === 0) throw AppError.notFound('Account not found');

      const acc = accountRes.rows[0];
      res.status(200).json({
        success: true,
        data: {
          id: acc.id,
          email: acc.email,
          displayName: acc.display_name,
          display_name: acc.display_name,
          hotelName: 'Oscar Dog Hotel',
          hotel_name: 'Oscar Dog Hotel',
          avatarUrl: acc.avatar_url,
          avatar_url: acc.avatar_url,
          lastLoginAt: acc.last_login_at,
          createdAt: acc.created_at
        }
      });
    } catch (err) {
      next(err);
    }
  }
}
