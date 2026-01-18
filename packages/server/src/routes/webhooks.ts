import { Router, Request, Response } from 'express';
import { WebhookController } from '../controllers/WebhookController';
import { authenticateClient } from '../middleware/auth';
import crypto from 'crypto';
import { exec } from 'child_process';
import path from 'path';

const router = Router();

// GitHub deployment webhook
router.post('/deploy', (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const secret = process.env.DEPLOY_WEBHOOK_SECRET;

  // Validate webhook secret is configured
  if (!secret) {
    console.error('[Deploy Webhook] DEPLOY_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  // Validate signature
  if (!signature) {
    console.error('[Deploy Webhook] Missing signature header');
    return res.status(401).json({ error: 'Missing signature' });
  }

  // Compute expected signature
  const payload = JSON.stringify(req.body);
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    console.error('[Deploy Webhook] Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Check if this is a push to main branch
  const ref = req.body.ref;
  if (ref !== 'refs/heads/main') {
    console.log(`[Deploy Webhook] Ignoring push to ${ref}`);
    return res.json({ message: `Ignored: push to ${ref}` });
  }

  // Get commit info
  const commit = req.body.head_commit;
  const commitMessage = commit?.message || 'unknown';
  const commitId = commit?.id?.substring(0, 7) || 'unknown';
  const pusher = req.body.pusher?.name || 'unknown';

  console.log(`[Deploy Webhook] Received push from ${pusher}: ${commitId} - ${commitMessage}`);

  // Trigger update in background
  const appDir = path.resolve(__dirname, '../../../..');
  const updateScript = path.join(appDir, 'app.sh');
  const logFile = '/var/log/rprint-deploy.log';

  exec(`${updateScript} update >> ${logFile} 2>&1 &`, (error) => {
    if (error) {
      console.error('[Deploy Webhook] Failed to trigger update:', error);
    }
  });

  console.log('[Deploy Webhook] Deployment triggered');
  res.json({
    message: 'Deployment triggered',
    commit: commitId,
    pusher: pusher
  });
});

// Client webhook management routes
router.get('/', authenticateClient, WebhookController.list);
router.post('/', authenticateClient, WebhookController.create);
router.get('/:id', authenticateClient, WebhookController.get);
router.put('/:id', authenticateClient, WebhookController.update);
router.delete('/:id', authenticateClient, WebhookController.delete);

export default router;
