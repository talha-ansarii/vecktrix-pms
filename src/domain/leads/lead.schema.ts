import { z } from "zod";
import {
  LeadStatus,
  LeadTemperature,
  LeadSource,
  ServiceInterest,
  MoneyBucket,
  TimelineBucket,
} from "@prisma/client";

export const createLeadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  serviceInterest: z.nativeEnum(ServiceInterest).optional(),
  notes: z.string().optional(),
  temperature: z.nativeEnum(LeadTemperature).optional(),
  moneyBucket: z.nativeEnum(MoneyBucket).optional(),
  timelineBucket: z.nativeEnum(TimelineBucket).optional(),
});

export const updateLeadSchema = createLeadSchema.partial().extend({
  id: z.string(),
  status: z.nativeEnum(LeadStatus).optional(),
  assignedToId: z.string().nullable().optional(),
});

export const createContactSchema = z.object({
  leadId: z.string(),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().optional(),
});

export const updateContactSchema = createContactSchema.partial().extend({
  id: z.string(),
});
