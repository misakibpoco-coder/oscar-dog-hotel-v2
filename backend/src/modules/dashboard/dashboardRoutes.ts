import { Router } from 'express';
import { DashboardController } from './dashboardController.js';
import { requireAuth } from '../../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', DashboardController.getDashboard);
router.get('/stats', DashboardController.getStats);
router.get('/attention', DashboardController.getAttention);

export const dashboardRoutes = router;
