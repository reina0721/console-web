import { z } from 'zod';
import { NOTIFICATION_CATEGORIES } from '@community-go/plugin-framework/notifications';

/** Navigable presentation query over the current account's complete inbox. */
export const inboxQuerySchema = z
  .object({
    q: z.string().trim().max(100),
    category: z.enum(['all', ...NOTIFICATION_CATEGORIES]),
    read: z.enum(['all', 'unread', 'read']),
    page: z.number().int().min(1).max(100000),
  })
  .strict();
export type InboxQuery = z.infer<typeof inboxQuerySchema>;
export const defaultInboxQuery: InboxQuery = { q: '', category: 'all', read: 'all', page: 1 };
