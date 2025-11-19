import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { WebhookModel } from '../models/WebhookModel';
import { WebhookEvent } from '../types';

export class WebhookController {
  static async list(req: AuthRequest, res: Response) {
    try {
      const clientId = req.clientId!;
      const webhooks = await WebhookModel.findByClientId(clientId);

      res.json(webhooks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const clientId = req.clientId!;
      const { url, events, secret, active } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      if (!events || !Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: 'Events array is required' });
      }

      // Validate events
      const validEvents = Object.values(WebhookEvent);
      for (const event of events) {
        if (!validEvents.includes(event)) {
          return res.status(400).json({
            error: `Invalid event: ${event}`,
            validEvents,
          });
        }
      }

      // Validate URL
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }

      const webhook = await WebhookModel.create(
        clientId,
        url,
        events,
        secret,
        active !== undefined ? active : true
      );

      res.status(201).json(webhook);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async get(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const webhook = await WebhookModel.findById(id);

      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      // Ensure client can only access their own webhooks
      if (webhook.clientId !== req.clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(webhook);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const clientId = req.clientId!;
      const { url, events, secret, active } = req.body;

      const webhook = await WebhookModel.findById(id);

      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      if (webhook.clientId !== clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate events if provided
      if (events) {
        if (!Array.isArray(events) || events.length === 0) {
          return res.status(400).json({ error: 'Events must be a non-empty array' });
        }

        const validEvents = Object.values(WebhookEvent);
        for (const event of events) {
          if (!validEvents.includes(event)) {
            return res.status(400).json({
              error: `Invalid event: ${event}`,
              validEvents,
            });
          }
        }
      }

      // Validate URL if provided
      if (url) {
        try {
          new URL(url);
        } catch {
          return res.status(400).json({ error: 'Invalid URL format' });
        }
      }

      const updated = await WebhookModel.update(id, clientId, {
        url,
        events,
        secret,
        active,
      });

      if (!updated) {
        return res.status(400).json({ error: 'No changes made' });
      }

      const updatedWebhook = await WebhookModel.findById(id);
      res.json(updatedWebhook);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const clientId = req.clientId!;

      const webhook = await WebhookModel.findById(id);

      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      if (webhook.clientId !== clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await WebhookModel.delete(id, clientId);

      res.json({ message: 'Webhook deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
