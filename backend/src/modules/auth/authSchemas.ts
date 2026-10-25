import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Valid email address required'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Valid email address required')
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional()
});
