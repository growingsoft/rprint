import { Router } from 'express';
import { WorkerController } from '../controllers/WorkerController';
import { authenticateWorker, authenticateClient } from '../middleware/auth';

const router = Router();

router.post('/heartbeat', authenticateWorker, WorkerController.heartbeat);
router.get('/', authenticateClient, WorkerController.list);
router.get('/me', authenticateWorker, WorkerController.get);
router.get('/:id/env', authenticateClient, WorkerController.downloadEnvFile);
router.delete('/:id', authenticateClient, WorkerController.delete);

export default router;
