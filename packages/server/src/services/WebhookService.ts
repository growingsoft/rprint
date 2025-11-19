import { WebhookModel } from '../models/WebhookModel';
import { WebhookEvent, PrintJob } from '../types';
import crypto from 'crypto';
import axios from 'axios';

export class WebhookService {
  static async triggerWebhook(
    clientId: string,
    event: WebhookEvent,
    job: PrintJob
  ): Promise<void> {
    try {
      // Get all active webhooks for this client and event
      const webhooks = await WebhookModel.findActiveByClientAndEvent(clientId, event);

      // Trigger each webhook in parallel
      const promises = webhooks.map((webhook) =>
        this.sendWebhook(webhook.id, webhook.url, webhook.secret, event, job)
      );

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error triggering webhooks:', error);
    }
  }

  static async triggerJobWebhook(
    webhookUrl: string,
    event: WebhookEvent,
    job: PrintJob
  ): Promise<void> {
    try {
      await this.sendWebhook(null, webhookUrl, undefined, event, job);
    } catch (error) {
      console.error('Error triggering job webhook:', error);
    }
  }

  private static async sendWebhook(
    webhookId: string | null,
    url: string,
    secret: string | undefined,
    event: WebhookEvent,
    job: PrintJob
  ): Promise<void> {
    try {
      const payload = {
        event,
        timestamp: new Date().toISOString(),
        data: {
          job: {
            id: job.id,
            clientId: job.clientId,
            printerId: job.printerId,
            fileName: job.fileName,
            status: job.status,
            copies: job.copies,
            colorMode: job.colorMode,
            duplex: job.duplex,
            orientation: job.orientation,
            paperSize: job.paperSize,
            createdAt: job.createdAt,
            assignedAt: job.assignedAt,
            completedAt: job.completedAt,
            errorMessage: job.errorMessage,
          },
        },
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'RPrint-Webhook/1.0',
        'X-RPrint-Event': event,
      };

      // Add HMAC signature if secret is provided
      if (secret) {
        const signature = crypto
          .createHmac('sha256', secret)
          .update(JSON.stringify(payload))
          .digest('hex');
        headers['X-RPrint-Signature'] = `sha256=${signature}`;
      }

      // Send webhook with 5 second timeout
      await axios.post(url, payload, {
        headers,
        timeout: 5000,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      // Update last triggered timestamp
      if (webhookId) {
        await WebhookModel.updateLastTriggered(webhookId);
      }

      console.log(`Webhook sent successfully to ${url} for event ${event}`);
    } catch (error: any) {
      console.error(`Failed to send webhook to ${url}:`, error.message);
      // Don't throw - we don't want webhook failures to break the main flow
    }
  }
}
