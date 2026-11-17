import { eq } from 'drizzle-orm';
import { db, notifications, type Notification, type NewNotification } from '../../database/index.js';

export class NotificationRepository {
  /**
   * Insert a new notification record into PostgreSQL.
   */
  async create(data: NewNotification): Promise<Notification> {
    const [record] = await db.insert(notifications).values(data).returning();
    return record;
  }

  /**
   * Find a notification by its primary UUID.
   */
  async findById(id: string): Promise<Notification | null> {
    const [record] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);
    return record ?? null;
  }

  /**
   * Find a notification by its idempotency key.
   * Used to check for duplicate requests before creating a new notification.
   */
  async findByIdempotencyKey(key: string): Promise<Notification | null> {
    const [record] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.idempotencyKey, key))
      .limit(1);
    return record ?? null;
  }

  /**
   * Update the status and optional error message of a notification.
   */
  async updateStatus(
    id: string,
    status: Notification['status'],
    errorMessage?: string | null
  ): Promise<Notification | null> {
    const [record] = await db
      .update(notifications)
      .set({
        status,
        errorMessage: errorMessage ?? null,
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, id))
      .returning();

    return record ?? null;
  }

  /**
   * Increment delivery attempts by 1.
   */
  async incrementAttempts(id: string): Promise<void> {
    const record = await this.findById(id);
    if (!record) return;

    await db
      .update(notifications)
      .set({
        deliveryAttempts: record.deliveryAttempts + 1,
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, id));
  }
}

export const notificationRepository = new NotificationRepository();
