import { z } from 'zod';
import { VALID_AVATAR_IDS, VALID_STATUS_IDS } from '../../constants/registries.js';

export const CreateDogSchema = z.object({
  name: z.string().min(1, 'Dog name is required').max(100),
  breed: z.string().min(1, 'Breed is required').max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'DOB must be YYYY-MM-DD').optional().or(z.literal('')),
  gender: z.enum(['Male', 'Female', 'Other'], { errorMap: () => ({ message: 'Gender must be Male, Female, or Other' }) }),
  weightKg: z.number().positive('Weight must be positive').optional().nullable(),
  avatarId: z.string().refine((val) => VALID_AVATAR_IDS.has(val), {
    message: 'Avatar ID must be one of the five universal avatars (avatar_1 to avatar_5)'
  }),
  specialNotes: z.string().max(1000).optional().nullable(),
  // Owner information for atomic resolution
  ownerName: z.string().min(1, 'Owner name is required'),
  ownerPhone: z.string().min(6, 'Valid owner phone number is required'),
  ownerEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  confirmExistingOwnerId: z.string().uuid().optional()
});

export const UpdateDogSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  breed: z.string().min(1).max(100).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  weightKg: z.number().positive().optional().nullable(),
  avatarId: z.string().refine((val) => VALID_AVATAR_IDS.has(val)).optional(),
  specialNotes: z.string().max(1000).optional().nullable(),
  ownerId: z.string().uuid().optional()
});

export const ListDogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  search: z.string().optional(),
  status: z.string().optional(),
  archived: z.enum(['true', 'false']).default('false')
});
