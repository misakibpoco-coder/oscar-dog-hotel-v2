import { Router } from 'express';
import { AuthController } from './authController.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { authRateLimiter } from '../../middlewares/rateLimiter.js';
import {
  LoginSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema
} from './authSchemas.js';

const router = Router();

router.post('/login', authRateLimiter, validate({ body: LoginSchema }), AuthController.login);
router.post('/refresh', validate({ body: RefreshTokenSchema }), AuthController.refresh);
router.post('/logout', requireAuth, AuthController.logout);
router.post('/forgot-password', authRateLimiter, validate({ body: ForgotPasswordSchema }), AuthController.forgotPassword);
router.post('/reset-password', authRateLimiter, validate({ body: ResetPasswordSchema }), AuthController.resetPassword);
router.get('/account', requireAuth, AuthController.getAccount);
router.get('/me', requireAuth, AuthController.getAccount);

export const authRoutes = router;
