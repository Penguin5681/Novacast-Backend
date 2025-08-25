import { Router } from 'express';
import { checkEmailAvailability, checkHandleAvailability, checkUsernameAvailability } from '../../controllers/users/user-validation.controller.ts';

const router = Router();

router.post('/username-check', checkUsernameAvailability);
router.post('/email-check', checkEmailAvailability);
router.post('/handle-check', checkHandleAvailability);

export default router;