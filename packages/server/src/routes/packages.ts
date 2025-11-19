import express from 'express';
import { PackageController } from '../controllers/PackageController';
import { authenticateClient, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Client package routes (require admin)
router.get('/client', authenticateClient, requireAdmin, PackageController.getClientPackages);
router.post('/client', authenticateClient, requireAdmin, PackageController.createClientPackage);
router.put('/client/:id', authenticateClient, requireAdmin, PackageController.updateClientPackage);
router.delete('/client/:id', authenticateClient, requireAdmin, PackageController.deleteClientPackage);
router.post('/client/:id/regenerate-token', authenticateClient, requireAdmin, PackageController.regenerateClientToken);
router.get('/client/:id/download', PackageController.downloadClientPackage); // Public endpoint for auto-update

// Server package routes (require admin)
router.get('/server', authenticateClient, requireAdmin, PackageController.getServerPackages);
router.post('/server', authenticateClient, requireAdmin, PackageController.createServerPackage);
router.put('/server/:id', authenticateClient, requireAdmin, PackageController.updateServerPackage);
router.delete('/server/:id', authenticateClient, requireAdmin, PackageController.deleteServerPackage);
router.post('/server/:id/regenerate-api-key', authenticateClient, requireAdmin, PackageController.regenerateServerApiKey);
router.get('/server/:id/download', PackageController.downloadServerPackage); // Public endpoint for auto-update

export default router;
