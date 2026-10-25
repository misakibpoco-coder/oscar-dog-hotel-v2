import { Router } from 'express';
import { StatusController } from './statusController.js';
import { requireAuth } from '../../middlewares/auth.js';

const router = Router();

router.get('/', StatusController.getStatuses);

export const statusRoutes = router;
