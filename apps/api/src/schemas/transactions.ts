import { z } from "zod";

export const newTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3).default("MXN"),
  category: z.string().min(1).max(32),
  occurredAt: z.number().int().positive(),
  note: z.string().max(280).optional().nullable(),
});

export const listFilterSchema = z.object({
  from: z.coerce.number().int().positive().optional(),
  to: z.coerce.number().int().positive().optional(),
  type: z.enum(["income", "expense"]).optional(),
  category: z.string().min(1).max(32).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  cursor: z.string().optional(),
});

export const updateTransactionSchema = newTransactionSchema.partial();

export const transactionIdParamSchema = z.object({
  id: z.string().min(1),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const bulkCategoryUpdateSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  category: z.string().min(1).max(32),
});
