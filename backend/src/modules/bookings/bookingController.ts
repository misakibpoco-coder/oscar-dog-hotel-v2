import { Request, Response, NextFunction } from 'express';
import { BookingService } from './bookingService.js';
import { StatusService } from '../status/statusService.js';

export class BookingController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const pageSize = parseInt(req.query.pageSize as string || '25', 10);
      const status = req.query.status as string;
      const dogId = req.query.dogId as string;
      const fromDate = req.query.fromDate as string;
      const toDate = req.query.toDate as string;

      const result = await BookingService.listBookings({
        page,
        pageSize,
        status,
        dogId,
        fromDate,
        toDate
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
      const booking = await BookingService.getBookingById(req.params.id);
      res.status(200).json({
        success: true,
        data: booking
      });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await BookingService.createBooking({
        ...req.body,
        sharedAccountId: req.user?.sharedAccountId
      });

      res.status(201).json({
        success: true,
        data: booking
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await BookingService.updateBooking(
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

  static async extend(req: Request, res: Response, next: NextFunction) {
    try {
      const { newCheckOutAt, notes } = req.body;
      const extended = await BookingService.extendBooking(
        req.params.id,
        newCheckOutAt,
        notes,
        req.user?.sharedAccountId
      );

      res.status(200).json({
        success: true,
        data: extended
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, effectiveAt, notes } = req.body;
      const updated = await StatusService.updateStatus({
        bookingId: req.params.id,
        newStatus: status,
        effectiveAt: new Date(effectiveAt),
        sharedAccountId: req.user?.sharedAccountId,
        notes
      });

      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  static async confirmOutgoing(req: Request, res: Response, next: NextFunction) {
    try {
      const confirmed = await BookingService.confirmOutgoing(
        req.params.id,
        req.user?.sharedAccountId
      );

      res.status(200).json({
        success: true,
        data: confirmed
      });
    } catch (err) {
      next(err);
    }
  }
}
