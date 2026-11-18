import type { Request, Response, NextFunction } from "express";
import { createNotificationSchema } from "./notification.validation.js";
import { notificationService } from "./notification.service.js";

export class NotificationController {
  /**
   * POST /api/v1/notifications
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedBody = createNotificationSchema.parse(req.body);
      const headerKey =
        req.header("idempotency-key") || req.header("x-idempotency-key");

      const { notification, isDuplicate } =
        await notificationService.ingestNotification(validatedBody, headerKey);

      if (isDuplicate) {
        res.setHeader("Idempotent-Replay", "true");
        res.status(200).json({
          success: true,
          data: {
            id: notification.id,
            status: notification.status,
            recipient: {
              email: notification.recipientEmail,
            },
            event: notification.event,
            createdAt: notification.createdAt,
            idempotencyKey: notification.idempotencyKey,
          },
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: {
          id: notification.id,
          status: notification.status,
          recipient: {
            email: notification.recipientEmail,
          },
          event: notification.event,
          createdAt: notification.createdAt,
          idempotencyKey: notification.idempotencyKey,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/notifications/:id
   */
  async getById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const notificationId = typeof id === 'string' ? id : (Array.isArray(id) ? id[0] : '');
      const notification = await notificationService.getById(notificationId);

      res.status(200).json({
        success: true,
        data: {
          id: notification.id,
          status: notification.status,
          recipient: {
            email: notification.recipientEmail,
          },
          event: notification.event,
          payload: notification.payload,
          deliveryAttempts: notification.deliveryAttempts,
          errorMessage: notification.errorMessage,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();
