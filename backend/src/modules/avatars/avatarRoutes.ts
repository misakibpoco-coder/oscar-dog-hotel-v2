import { Router } from 'express';
import { AvatarController } from './avatarController.js';
import { requireAuth } from '../../middlewares/auth.js';

const router = Router();

router.get('/', AvatarController.getAvatars);

export const avatarRoutes = router;
