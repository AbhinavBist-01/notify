import { notificationRepository } from './notification.repository.js';
import type { Notification } from '../../database/schema.js';
import type { CreateNotificationDTO } from './notification.validation.js';
import { NotFoundError } from '../../middleware/error-handler.js';

export interface IngestionResult {
  notification: Notification;
  isDuplicate: boolean;
}

export class NotificationService {
  /**
   * Ingest a notification request with idempotency protection.
   */
  async ingestNotification(
    input: CreateNotificationDTO,
    headerIdempotencyKey?: string
  ): Promise<IngestionResult> {
    const idempotencyKey = input.idempotencyKey || headerIdempotencyKey || null;

    // 1. If idempotency key provided, check if already processed
    if (idempotencyKey) {
      const existing = await notificationRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        return {
          notification: existing,
          isDuplicate: true,
        };
      }
    }

    // 2. Persist new notification
    try {
      const record = await notificationRepository.create({
        recipientEmail: input.recipient.email,
        event: input.event,
        payload: input.data,
        status: 'PENDING',
        idempotencyKey,
      });

      return {
        notification: record,
        isDuplicate: false,
      };
    } catch (err: unknown) {
      // 3. Handle concurrent race condition on duplicate idempotency key
      const pgError = err as { code?: string };
      if (pgError.code === '23505' && idempotencyKey) {
        const existing = await notificationRepository.findByIdempotencyKey(idempotencyKey);
        if (existing) {
          return {
            notification: existing,
            isDuplicate: true,
          };
        }
      }
      throw err;
    }
  }

  /**
   * Retrieve notification by ID
   */
  async getById(id: string): Promise<Notification> {
    const notification = await notificationRepository.findById(id);
    if (!notification) {
      throw new NotFoundError(`Notification with ID '${id}' not found`);
    }
    return notification;
  }
}

export const notificationService = new NotificationService();
