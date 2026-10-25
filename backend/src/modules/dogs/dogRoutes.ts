import { Router } from 'express';
import { DogController } from './dogController.js';
import { requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { CreateDogSchema, UpdateDogSchema, ListDogsQuerySchema } from './dogSchemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: ListDogsQuerySchema }), DogController.list);
router.get('/:id', DogController.getById);
router.post('/', validate({ body: CreateDogSchema }), DogController.create);
router.patch('/:id', validate({ body: UpdateDogSchema }), DogController.update);
router.post('/:id/archive', DogController.archive);
router.post('/:id/restore', DogController.restore);

export const dogRoutes = router;
