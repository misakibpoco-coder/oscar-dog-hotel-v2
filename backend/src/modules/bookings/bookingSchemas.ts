import { z } from 'zod';
import { VALID_STATUS_IDS } from '../../constants/registries.js';

export const CreateBookingSchema = z.object({
  dogId: z.string().uuid('Valid dog ID required'),
  checkInAt: z.string().datetime({ message: 'checkInAt must be an ISO 8601 UTC timestamp' }),
  checkOutAt: z.string().datetime({ message: 'checkOutAt must be an ISO 8601 UTC timestamp' }),
  status: z.string().refine((val) => VALID_STATUS_IDS.has(val), {
    message: 'Status must be one of the six universal statuses: RECEIVED, IN_HOTEL, UPCOMING, COMPLETE, CANCEL, OUTGOING'
  }).default('UPCOMING'),
  services: z.array(z.string()).default([]),
  notes: z.string().max(1000).optional().nullable()
});

export const UpdateBookingSchema = z.object({
  checkInAt: z.string().datetime().optional(),
  checkOutAt: z.string().datetime().optional(),
  services: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional().nullable()
});

export const ExtendBookingSchema = z.object({
  newCheckOutAt: z.string().datetime({ message: 'newCheckOutAt must be an ISO 8601 UTC timestamp' }),
  notes: z.string().max(500).optional()
});

export const UpdateBookingStatusSchema = z.object({
  status: z.string().refine((val) => VALID_STATUS_IDS.has(val), {
    message: 'Invalid universal status'
  }),
  effectiveAt: z.string().datetime({ message: 'A valid effectiveAt UTC timestamp is required' }),
  notes: z.string().max(500).optional()
});

export const ListBookingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  status: z.string().optional(),
  dogId: z.string().uuid().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
});
