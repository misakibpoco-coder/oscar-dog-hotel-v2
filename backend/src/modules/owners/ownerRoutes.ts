import { Router } from 'express';
import { OwnerController } from './ownerController.js';
import { requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { CreateOwnerSchema, UpdateOwnerSchema } from './ownerSchemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', OwnerController.list);
router.get('/:id', OwnerController.getById);
router.post('/', validate({ body: CreateOwnerSchema }), OwnerController.create);
router.patch('/:id', validate({ body: UpdateOwnerSchema }), OwnerController.update);

export const ownerRoutes = router;
