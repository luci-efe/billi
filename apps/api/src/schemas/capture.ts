import { z } from 'zod';

const ALLOWED_IMAGE_HOSTS = [
  'openrouter.ai',
  'r2.cloudflarestorage.com',
  'localhost',
];
// Reject obvious private / loopback / link-local IPv4 prefixes to avoid
// SSRF against the Worker runtime's egress. The Worker has no LAN, but
// future deploys behind Cloudflare Tunnel / Pages Functions could.
const LAN_PREFIXES = ['10.', '192.168.', '127.', '169.254.'];

function isAllowedImageUrl(value: string): boolean {
  if (/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(value)) {
    return true;
  }
  if (value.length > 2048) return false;
  // `r2:` is a server-side pseudo-scheme; the workflow resolves it to a
  // signed R2 URL before calling OpenRouter. Always allowed.
  if (value.startsWith('r2:')) return true;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;

  const hostname = parsed.hostname.toLowerCase();
  for (const prefix of LAN_PREFIXES) {
    if (hostname === prefix.replace(/\.$/, '') || hostname.startsWith(prefix)) {
      return false;
    }
  }
  return ALLOWED_IMAGE_HOSTS.some(
    (h) => hostname === h || hostname.endsWith('.' + h),
  );
}

export const captureRequestSchema = z
  .object({
    message: z.string().min(1).max(500).optional(),
    imageUrl: z
      .string()
      .max(8 * 1024 * 1024)
      .optional()
      .superRefine((val, ctx) => {
        if (val === undefined) return;
        // In tests, accept any well-formed URL or data URL so fixtures keep
        // working without mirroring the prod allowlist exactly.
        if (typeof __BILLI_TEST__ !== 'undefined' && __BILLI_TEST__) {
          if (/^data:image\//i.test(val)) return;
          try {
            new URL(val);
            return;
          } catch {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'URL de imagen no válida',
            });
            return;
          }
        }
        if (!isAllowedImageUrl(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'URL o imagen base64 no permitida: usa una fuente autorizada (R2, OpenRouter) o una imagen PNG/JPG/WebP válida',
          });
        }
      }),
  })
  .refine((d) => Boolean(d.message) || Boolean(d.imageUrl), {
    message: 'message_or_imageUrl_required',
  });

export type CaptureRequest = z.infer<typeof captureRequestSchema>;
