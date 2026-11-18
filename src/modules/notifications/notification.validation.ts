import { z } from 'zod';

export const createNotificationSchema = z.object({
  recipient: z.object({
    email: z.string().email('Invalid email address').trim().toLowerCase(),
  }),
  event: z.string().min(1, 'Event name is required').trim(),
  data: z.record(z.string(), z.unknown()).default({}),
  idempotencyKey: z.string().max(255).optional(),
});

export type CreateNotificationDTO = z.infer<typeof createNotificationSchema>;
