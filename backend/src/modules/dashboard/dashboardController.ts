import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboardService.js';

export class DashboardController {
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await DashboardService.getDashboardMetrics();
      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  }

  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await DashboardService.getDashboardMetrics();
      res.status(200).json({
        success: true,
        data: data.stats
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAttention(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await DashboardService.getDashboardMetrics();
      res.status(200).json({
        success: true,
        data: data.overdueAttentionList
      });
    } catch (err) {
      next(err);
    }
  }
}
