import { Request, Response, NextFunction } from 'express';
import { OwnerService } from './ownerService.js';

export class OwnerController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const pageSize = parseInt(req.query.pageSize as string || '25', 10);
      const search = req.query.search as string;

      const result = await OwnerService.listOwners(page, pageSize, search);
      res.status(200).json({
        success: true,
        data: result.items,
        meta: result.meta
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const owner = await OwnerService.getOwnerById(req.params.id);
      res.status(200).json({
        success: true,
        data: owner
      });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, phone, email, confirmExistingOwnerId } = req.body;
      const owner = await OwnerService.resolveOwner({
        name,
        phone,
        email,
        confirmExistingOwnerId,
        sharedAccountId: req.user?.sharedAccountId
      });

      res.status(owner.isNew ? 201 : 200).json({
        success: true,
        data: owner
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await OwnerService.updateOwner(
        req.params.id,
        req.body,
        req.user?.sharedAccountId
      );
      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }
}
