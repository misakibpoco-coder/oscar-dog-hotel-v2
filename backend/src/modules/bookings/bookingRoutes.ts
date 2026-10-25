import { Router } from 'express';
import { BookingController } from './bookingController.js';
import { requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  CreateBookingSchema,
  UpdateBookingSchema,
  ExtendBookingSchema,
  UpdateBookingStatusSchema,
  ListBookingsQuerySchema
} from './bookingSchemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: ListBookingsQuerySchema }), BookingController.list);
router.get('/:id', BookingController.getById);
router.post('/', validate({ body: CreateBookingSchema }), BookingController.create);
router.patch('/:id', validate({ body: UpdateBookingSchema }), BookingController.update);
router.post('/:id/extend', validate({ body: ExtendBookingSchema }), BookingController.extend);
router.post('/:id/status', validate({ body: UpdateBookingStatusSchema }), BookingController.updateStatus);
router.post('/:id/confirm-outgoing', BookingController.confirmOutgoing);

export const bookingRoutes = router;
