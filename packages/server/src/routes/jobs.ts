import { Router } from 'express';
import { PrintJobController } from '../controllers/PrintJobController';
import { authenticateClient, authenticateWorker } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Client routes
router.post('/', authenticateClient, upload.single('file'), PrintJobController.create);
router.post('/print-url', authenticateClient, PrintJobController.createFromUrl);
router.get('/', authenticateClient, PrintJobController.list);
router.get('/:id', authenticateClient, PrintJobController.get);
router.delete('/:id', authenticateClient, PrintJobController.cancel);

// Worker routes
router.get('/poll/pending', authenticateWorker, PrintJobController.pollJobs);
router.put('/:id/status', authenticateWorker, PrintJobController.updateJobStatus);
router.get('/:id/download', authenticateWorker, PrintJobController.downloadFile);

export default router;
