import { Router } from 'express';
import { checkEmailAvailability, checkUsernameAvailability } from '../../controllers/users/user-validation.controller.ts';

const router = Router();

router.post('/username-check', checkUsernameAvailability);
router.post('/email-check', checkEmailAvailability);

export default router;