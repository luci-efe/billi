import { z } from 'zod';

export const captureRequestSchema = z
  .object({
    message: z.string().min(1).max(500).optional(),
    imageUrl: z.string().url().optional(),
  })
  .refine((d) => Boolean(d.message) || Boolean(d.imageUrl), {
    message: 'message_or_imageUrl_required',
  });

export type CaptureRequest = z.infer<typeof captureRequestSchema>;
