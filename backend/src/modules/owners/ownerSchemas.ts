import { z } from 'zod';

export const CreateOwnerSchema = z.object({
  name: z.string().min(1, 'Owner name is required').max(150),
  phone: z.string().min(6, 'Valid phone number is required').max(50),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  confirmExistingOwnerId: z.string().uuid().optional()
});

export const UpdateOwnerSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  phone: z.string().min(6).max(50).optional(),
  email: z.string().email().optional().or(z.literal(''))
});
