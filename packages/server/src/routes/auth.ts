import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateClient } from '../middleware/auth';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/register-worker', AuthController.registerWorker);
router.get('/me', authenticateClient, AuthController.me);

export default router;
