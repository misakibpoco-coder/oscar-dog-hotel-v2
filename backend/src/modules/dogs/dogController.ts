import { Request, Response, NextFunction } from 'express';
import { DogService } from './dogService.js';

export class DogController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const pageSize = parseInt(req.query.pageSize as string || '25', 10);
      const search = req.query.search as string;
      const status = req.query.status as string;
      const archived = req.query.archived as string;

      const result = await DogService.listDogs({
        page,
        pageSize,
        search,
        status,
        archived
      });

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
      const dog = await DogService.getDogById(req.params.id);
      res.status(200).json({
        success: true,
        data: dog
      });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dog = await DogService.createDog({
        ...req.body,
        sharedAccountId: req.user?.sharedAccountId
      });

      res.status(201).json({
        success: true,
        data: dog
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await DogService.updateDog(
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

  static async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DogService.archiveDog(req.params.id, req.user?.sharedAccountId);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  static async restore(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DogService.restoreDog(req.params.id, req.user?.sharedAccountId);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}
