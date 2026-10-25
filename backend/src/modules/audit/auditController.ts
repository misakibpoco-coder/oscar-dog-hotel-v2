import { Request, Response, NextFunction } from 'express';
import { AuditService } from './auditService.js';

export class AuditController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const pageSize = parseInt(req.query.pageSize as string || '25', 10);

      const result = await AuditService.listLogs(page, pageSize);
      res.status(200).json({
        success: true,
        data: result.items,
        meta: result.meta
      });
    } catch (err) {
      next(err);
    }
  }
}
