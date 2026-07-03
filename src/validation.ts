import { z } from 'zod';

// Tool argument schemas
export const GetConstitutionSchema = z.object({
  personaId: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

export const GetSystemPromptSchema = z.object({
  personaId: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

export const SetPersonaSchema = z.object({
  personaId: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

export const GetUvcQualitiesSchema = z.object({
  personaId: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .default('ambassador'),
});

export const GetExportSchema = z.object({
  personaId: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/),
  format: z.enum(['json', 'yaml', 'markdown']).optional().default('json'),
  includeMetadata: z.boolean().optional().default(true),
  includePersonas: z.boolean().optional().default(true),
  adherenceLevel: z.enum(['minimal', 'standard', 'strict']).optional().default('standard'),
  constitutionIds: z.array(z.string()).min(1).max(10).optional(),
});

export const GetAnchorSchema = z.object({
  personaId: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/),
  maxLength: z.number().min(100).max(2000).optional().default(1500),
});

export const AttestResponseSchema = z.object({
  response: z.string().min(1),
  personaId: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

export const PreviewExportSchema = z.object({
  personaId: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .default('ambassador'),
  includeSystemPrompt: z.boolean().default(true),
  includeConstitutions: z.boolean().default(true),
  includeUvc: z.boolean().default(true),
});

export const GetConstitutionByIdSchema = z.object({
  constitutionId: z.string().min(1).max(200),
});

export const SearchConstitutionsSchema = z.object({
  query: z.string().max(200).optional().default(''),
  personaId: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
});

export const AdjudicateSchema = z.object({
  question: z.string().min(1).max(10000),
  personaId: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .default('ambassador'),
  context: z
    .object({
      constitutions: z.array(z.string()).optional(),
      adherenceLevel: z.number().min(1).max(5).default(3),
      influenceScope: z
        .enum(['advise_only', 'compare_options', 'motivate_with_disclosure'])
        .default('advise_only'),
      userId: z.string().optional(),
      sessionId: z.string().optional(),
    })
    .optional(),
});

export const HeartbeatSchema = z.object({
  messageCount: z.number().min(0).default(0),
  personaId: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .default('ambassador'),
  force: z.boolean().default(false),
});

export const MultiScaleHandshakeSchema = z.object({
  parties: z
    .array(
      z.object({
        entityId: z.string().min(1),
        scale: z.enum(['micro', 'meso', 'macro']),
        capabilities: z.array(z.string()).optional(),
      })
    )
    .min(1),
  invariants: z.array(z.string()).optional().default([]),
});

export const GetScaleAttestationSchema = z.object({
  entityId: z.string().min(1),
  scale: z.enum(['micro', 'meso', 'macro']),
  includeChain: z.boolean().default(false),
});

// Tool type validation
export type GetConstitutionArgs = z.infer<typeof GetConstitutionSchema>;
export type GetSystemPromptArgs = z.infer<typeof GetSystemPromptSchema>;
export type SetPersonaArgs = z.infer<typeof SetPersonaSchema>;
export type GetUvcQualitiesArgs = z.infer<typeof GetUvcQualitiesSchema>;
export type GetExportArgs = z.infer<typeof GetExportSchema>;
export type GetAnchorArgs = z.infer<typeof GetAnchorSchema>;
export type AttestResponseArgs = z.infer<typeof AttestResponseSchema>;
export type PreviewExportArgs = z.infer<typeof PreviewExportSchema>;
export type GetConstitutionByIdArgs = z.infer<typeof GetConstitutionByIdSchema>;
export type SearchConstitutionsArgs = z.infer<typeof SearchConstitutionsSchema>;
export type AdjudicateArgs = z.infer<typeof AdjudicateSchema>;
export type HeartbeatArgs = z.infer<typeof HeartbeatSchema>;
export type MultiScaleHandshakeArgs = z.infer<typeof MultiScaleHandshakeSchema>;
export type GetScaleAttestationArgs = z.infer<typeof GetScaleAttestationSchema>;

// Validation helper
export function validateToolArgs<T extends z.ZodTypeAny>(schema: T, args: unknown): z.output<T> {
  try {
    return schema.parse(args);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid tool arguments: ${errors}`);
    }
    throw error;
  }
}
