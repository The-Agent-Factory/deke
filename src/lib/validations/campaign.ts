import { z } from 'zod'

// Campaign status enum validation
export const campaignStatusSchema = z.enum([
  'DRAFT',
  'READY',
  'APPROVED',
  'ACTIVE',
  'SENDING',
  'PAUSED',
  'COMPLETED',
  'CANCELLED'
])

// Create campaign schema
export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(255),
  baseLocation: z.string().min(1, 'Base location is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(1).max(1000).default(100), // miles
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  bookingId: z.string().optional().nullable(),
  targetOrgTypes: z.string().optional().nullable(), // JSON array of org type strings
  includeOffSeason: z.boolean().optional().default(false),
})

// Update campaign schema (all fields optional)
export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  baseLocation: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius: z.number().min(1).max(1000).optional(),
  status: campaignStatusSchema.optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  includeOffSeason: z.boolean().optional(),
})

// Query filters for listing campaigns
export const campaignFiltersSchema = z.object({
  status: campaignStatusSchema.optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().min(0)).optional(),
})

// Type exports
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>
export type CampaignFilters = z.infer<typeof campaignFiltersSchema>
