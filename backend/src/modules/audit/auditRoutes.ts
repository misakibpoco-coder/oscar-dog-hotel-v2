import { Router } from 'express';
import { AuditController } from './auditController.js';
import { requireAuth } from '../../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', AuditController.list);

export const auditRoutes = router;
