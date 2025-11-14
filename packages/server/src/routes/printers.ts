import { Router } from 'express';
import { PrinterController } from '../controllers/PrinterController';
import { authenticateClient, authenticateWorker } from '../middleware/auth';

const router = Router();

// Client routes
router.get('/', authenticateClient, PrinterController.list);
router.get('/:id', authenticateClient, PrinterController.get);

// Virtual printer endpoints
router.get('/virtual-printer/list', authenticateClient, PrinterController.listForVirtualPrinter);

// Admin endpoints
router.put('/:id/settings', authenticateClient, PrinterController.updateSettings);

// Worker routes
router.post('/sync', authenticateWorker, PrinterController.syncPrinters);

export default router;
