import { z } from 'zod';

export const addItemSchema = z.object({
  consultationId: z.string().uuid(),
  medicationId: z.string().uuid().optional().or(z.literal('')),
  label: z.string().trim().min(1).max(300),
  posologie: z.string().trim().max(200).optional().or(z.literal('')),
  duration: z.string().trim().max(100).optional().or(z.literal('')),
  quantity: z.string().trim().max(100).optional().or(z.literal('')),
  instructions: z.string().trim().max(500).optional().or(z.literal('')),
});

export const updateItemSchema = z.object({
  itemId: z.string().uuid(),
  posologie: z.string().trim().max(200).optional().or(z.literal('')),
  duration: z.string().trim().max(100).optional().or(z.literal('')),
  quantity: z.string().trim().max(100).optional().or(z.literal('')),
  instructions: z.string().trim().max(500).optional().or(z.literal('')),
});

export const itemIdSchema = z.object({ itemId: z.string().uuid() });

export const reorderSchema = z.object({
  itemId: z.string().uuid(),
  direction: z.enum(['up', 'down']),
});

export type AddItemInput = z.infer<typeof addItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;
