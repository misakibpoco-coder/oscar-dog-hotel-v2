import { Router } from 'express';
import { SettingsController } from './settingsController.js';
import { requireAuth } from '../../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', SettingsController.getSettings);
router.patch('/', SettingsController.updateSettings);
router.get('/export', SettingsController.exportData);

export const settingsRoutes = router;
