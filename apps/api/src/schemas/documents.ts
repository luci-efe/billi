import { z } from "zod";
import { transactionIdParamSchema } from "./transactions";

export const txIdParamSchema = z.object({
  txId: transactionIdParamSchema.shape.id,
});

export const documentIdParamSchema = z.object({
  docId: z.string().min(1),
});

export const documentMetadataSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number().int().nonnegative(),
  createdAt: z.number().int(),
});

export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;
