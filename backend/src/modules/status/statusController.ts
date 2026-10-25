import { Request, Response } from 'express';
import { UNIVERSAL_STATUSES, UNIVERSAL_STATUS_LIST } from '../../constants/registries.js';

export class StatusController {
  static getStatuses(req: Request, res: Response) {
    const statuses = UNIVERSAL_STATUS_LIST.map((key) => UNIVERSAL_STATUSES[key]);
    res.status(200).json({
      success: true,
      data: statuses
    });
  }
}
