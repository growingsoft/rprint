import { Router } from 'express';
import { WorkerController } from '../controllers/WorkerController';
import { authenticateWorker, authenticateClient } from '../middleware/auth';

const router = Router();

router.post('/heartbeat', authenticateWorker, WorkerController.heartbeat);
router.get('/', authenticateClient, WorkerController.list);
router.get('/me', authenticateWorker, WorkerController.get);

export default router;
