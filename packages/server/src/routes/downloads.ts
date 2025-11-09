import { Router } from 'express';
import { DownloadController } from '../controllers/DownloadController';

const router = Router();

// Get download information
router.get('/info', DownloadController.getDownloadInfo);

// Download Windows service package
router.get('/windows-service', DownloadController.downloadWindowsService);

// Download Electron client package
router.get('/electron-client', DownloadController.downloadElectronClient);

// Register worker and get download info (public endpoint)
router.post('/register-and-download', DownloadController.registerAndDownload);

export default router;
