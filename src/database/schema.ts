import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const notificationStatusEnum = pgEnum('notification_status', [
  'PENDING',
  'QUEUED',
  'PROCESSING',
  'DELIVERED',
  'FAILED',
]);

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
  event: varchar('event', { length: 100 }).notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
  status: notificationStatusEnum('status').notNull().default('PENDING'),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
  deliveryAttempts: integer('delivery_attempts').notNull().default(0),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
