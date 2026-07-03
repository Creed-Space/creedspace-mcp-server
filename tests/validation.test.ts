import {
  validateToolArgs,
  GetConstitutionSchema,
  GetSystemPromptSchema,
  SetPersonaSchema,
  GetExportSchema,
  GetAnchorSchema,
  AttestResponseSchema,
  PreviewExportSchema,
  GetConstitutionByIdSchema,
  SearchConstitutionsSchema,
  AdjudicateSchema,
  HeartbeatSchema,
  GetUvcQualitiesSchema,
  MultiScaleHandshakeSchema,
  GetScaleAttestationSchema,
} from '../src/validation';

describe('MCP Validation Schemas', () => {
  describe('GetConstitutionSchema', () => {
    it('should accept valid persona IDs', () => {
      const validIds = ['ambassador', 'nanny', 'sentinel', 'test_123', 'test-456'];
      validIds.forEach(personaId => {
        const result = validateToolArgs(GetConstitutionSchema, { personaId });
        expect(result.personaId).toBe(personaId);
      });
    });

    it('should reject invalid characters in persona ID', () => {
      const invalidIds = [
        'test<script>',
        'test@email',
        'test space',
        'test#hash',
        'test$dollar',
        'test%percent',
      ];
      invalidIds.forEach(personaId => {
        expect(() => validateToolArgs(GetConstitutionSchema, { personaId }))
          .toThrow('Invalid tool arguments');
      });
    });

    it('should reject empty persona ID', () => {
      expect(() => validateToolArgs(GetConstitutionSchema, { personaId: '' }))
        .toThrow('Invalid tool arguments');
    });

    it('should reject persona ID exceeding max length', () => {
      const longId = 'a'.repeat(51);
      expect(() => validateToolArgs(GetConstitutionSchema, { personaId: longId }))
        .toThrow('Invalid tool arguments');
    });

    it('should accept persona ID at max length boundary', () => {
      const maxId = 'a'.repeat(50);
      const result = validateToolArgs(GetConstitutionSchema, { personaId: maxId });
      expect(result.personaId).toBe(maxId);
    });
  });

  describe('GetSystemPromptSchema', () => {
    it('should validate persona ID with same rules as GetConstitutionSchema', () => {
      const result = validateToolArgs(GetSystemPromptSchema, { personaId: 'ambassador' });
      expect(result.personaId).toBe('ambassador');
    });

    it('should reject invalid persona IDs', () => {
      expect(() => validateToolArgs(GetSystemPromptSchema, { personaId: 'test space' }))
        .toThrow('Invalid tool arguments');
    });
  });

  describe('SetPersonaSchema', () => {
    it('should validate persona ID', () => {
      const result = validateToolArgs(SetPersonaSchema, { personaId: 'sentinel' });
      expect(result.personaId).toBe('sentinel');
    });

    it('should reject invalid persona IDs', () => {
      expect(() => validateToolArgs(SetPersonaSchema, { personaId: '' }))
        .toThrow('Invalid tool arguments');
    });
  });

  describe('GetUvcQualitiesSchema', () => {
    it('should validate persona ID with canonical persona rules', () => {
      const result = validateToolArgs(GetUvcQualitiesSchema, { personaId: 'ambassador' });
      expect(result.personaId).toBe('ambassador');
    });

    it('should reject path traversal persona IDs', () => {
      expect(() => validateToolArgs(GetUvcQualitiesSchema, { personaId: '../admin' }))
        .toThrow('Invalid tool arguments');
    });
  });

  describe('GetExportSchema', () => {
    it('should accept valid export request with all options', () => {
      const result = validateToolArgs(GetExportSchema, {
        personaId: 'ambassador',
        format: 'yaml',
        includeMetadata: false,
        includePersonas: false,
        adherenceLevel: 'strict',
        constitutionIds: ['const-1', 'const-2'],
      });
      expect(result.personaId).toBe('ambassador');
      expect(result.format).toBe('yaml');
      expect(result.includeMetadata).toBe(false);
      expect(result.includePersonas).toBe(false);
      expect(result.adherenceLevel).toBe('strict');
      expect(result.constitutionIds).toEqual(['const-1', 'const-2']);
    });

    it('should apply defaults when options omitted', () => {
      const result = validateToolArgs(GetExportSchema, { personaId: 'nanny' });
      expect(result.format).toBe('json');
      expect(result.includeMetadata).toBe(true);
      expect(result.includePersonas).toBe(true);
      expect(result.adherenceLevel).toBe('standard');
      expect(result.constitutionIds).toBeUndefined();
    });

    it('should validate format enum', () => {
      const validFormats = ['json', 'yaml', 'markdown'] as const;
      validFormats.forEach(format => {
        const result = validateToolArgs(GetExportSchema, {
          personaId: 'test',
          format,
        });
        expect(result.format).toBe(format);
      });
    });

    it('should reject invalid format', () => {
      expect(() => validateToolArgs(GetExportSchema, {
        personaId: 'test',
        format: 'xml',
      })).toThrow('Invalid tool arguments');
    });

    it('should validate adherence level enum', () => {
      const validLevels = ['minimal', 'standard', 'strict'] as const;
      validLevels.forEach(adherenceLevel => {
        const result = validateToolArgs(GetExportSchema, {
          personaId: 'test',
          adherenceLevel,
        });
        expect(result.adherenceLevel).toBe(adherenceLevel);
      });
    });

    it('should reject invalid adherence level', () => {
      expect(() => validateToolArgs(GetExportSchema, {
        personaId: 'test',
        adherenceLevel: 'extreme',
      })).toThrow('Invalid tool arguments');
    });

    it('should enforce constitution IDs array min length', () => {
      expect(() => validateToolArgs(GetExportSchema, {
        personaId: 'test',
        constitutionIds: [],
      })).toThrow('Invalid tool arguments');
    });

    it('should enforce constitution IDs array max length', () => {
      const tooMany = Array.from({ length: 11 }, (_, i) => `const-${i}`);
      expect(() => validateToolArgs(GetExportSchema, {
        personaId: 'test',
        constitutionIds: tooMany,
      })).toThrow('Invalid tool arguments');
    });

    it('should accept constitution IDs at max boundary', () => {
      const maxConstitutions = Array.from({ length: 10 }, (_, i) => `const-${i}`);
      const result = validateToolArgs(GetExportSchema, {
        personaId: 'test',
        constitutionIds: maxConstitutions,
      });
      expect(result.constitutionIds).toHaveLength(10);
    });
  });

  describe('GetAnchorSchema', () => {
    it('should validate maxLength bounds', () => {
      const result = validateToolArgs(GetAnchorSchema, {
        personaId: 'nanny',
        maxLength: 1000,
      });
      expect(result.maxLength).toBe(1000);
    });

    it('should apply default maxLength', () => {
      const result = validateToolArgs(GetAnchorSchema, { personaId: 'test' });
      expect(result.maxLength).toBe(1500);
    });

    it('should reject maxLength below minimum', () => {
      expect(() => validateToolArgs(GetAnchorSchema, {
        personaId: 'test',
        maxLength: 99,
      })).toThrow('Invalid tool arguments');
    });

    it('should reject maxLength above maximum', () => {
      expect(() => validateToolArgs(GetAnchorSchema, {
        personaId: 'test',
        maxLength: 2001,
      })).toThrow('Invalid tool arguments');
    });

    it('should accept maxLength at min boundary', () => {
      const result = validateToolArgs(GetAnchorSchema, {
        personaId: 'test',
        maxLength: 100,
      });
      expect(result.maxLength).toBe(100);
    });

    it('should accept maxLength at max boundary', () => {
      const result = validateToolArgs(GetAnchorSchema, {
        personaId: 'test',
        maxLength: 2000,
      });
      expect(result.maxLength).toBe(2000);
    });
  });

  describe('AttestResponseSchema', () => {
    it('should require response text', () => {
      expect(() => validateToolArgs(AttestResponseSchema, { personaId: 'test' }))
        .toThrow('Invalid tool arguments');
    });

    it('should reject empty response', () => {
      expect(() => validateToolArgs(AttestResponseSchema, {
        response: '',
        personaId: 'test',
      })).toThrow('Invalid tool arguments');
    });

    it('should accept valid attestation request', () => {
      const result = validateToolArgs(AttestResponseSchema, {
        response: 'This is a test response',
        personaId: 'ambassador',
      });
      expect(result.response).toBe('This is a test response');
      expect(result.personaId).toBe('ambassador');
    });

    it('should accept long response text', () => {
      const longResponse = 'a'.repeat(10000);
      const result = validateToolArgs(AttestResponseSchema, {
        response: longResponse,
        personaId: 'test',
      });
      expect(result.response).toBe(longResponse);
    });
  });

  describe('PreviewExportSchema', () => {
    it('should apply all defaults', () => {
      const result = validateToolArgs(PreviewExportSchema, {});
      expect(result.personaId).toBe('ambassador');
      expect(result.includeSystemPrompt).toBe(true);
      expect(result.includeConstitutions).toBe(true);
      expect(result.includeUvc).toBe(true);
    });

    it('should accept explicit values', () => {
      const result = validateToolArgs(PreviewExportSchema, {
        personaId: 'sentinel',
        includeSystemPrompt: false,
        includeConstitutions: false,
        includeUvc: false,
      });
      expect(result.personaId).toBe('sentinel');
      expect(result.includeSystemPrompt).toBe(false);
      expect(result.includeConstitutions).toBe(false);
      expect(result.includeUvc).toBe(false);
    });

    it('should validate persona ID format', () => {
      expect(() => validateToolArgs(PreviewExportSchema, {
        personaId: 'invalid@id',
      })).toThrow('Invalid tool arguments');
    });
  });

  describe('GetConstitutionByIdSchema', () => {
    it('should accept valid constitution ID', () => {
      const result = validateToolArgs(GetConstitutionByIdSchema, {
        constitutionId: 'ethical-framework-v1',
      });
      expect(result.constitutionId).toBe('ethical-framework-v1');
    });

    it('should reject empty constitution ID', () => {
      expect(() => validateToolArgs(GetConstitutionByIdSchema, {
        constitutionId: '',
      })).toThrow('Invalid tool arguments');
    });

    it('should reject constitution ID exceeding max length', () => {
      const longId = 'a'.repeat(201);
      expect(() => validateToolArgs(GetConstitutionByIdSchema, {
        constitutionId: longId,
      })).toThrow('Invalid tool arguments');
    });

    it('should accept constitution ID at max boundary', () => {
      const maxId = 'a'.repeat(200);
      const result = validateToolArgs(GetConstitutionByIdSchema, {
        constitutionId: maxId,
      });
      expect(result.constitutionId).toBe(maxId);
    });
  });

  describe('SearchConstitutionsSchema', () => {
    it('should accept empty search', () => {
      const result = validateToolArgs(SearchConstitutionsSchema, {});
      expect(result.query).toBe('');
      expect(result.personaId).toBeUndefined();
    });

    it('should accept query with persona filter', () => {
      const result = validateToolArgs(SearchConstitutionsSchema, {
        query: 'safety',
        personaId: 'sentinel',
      });
      expect(result.query).toBe('safety');
      expect(result.personaId).toBe('sentinel');
    });

    it('should reject query exceeding max length', () => {
      const longQuery = 'a'.repeat(201);
      expect(() => validateToolArgs(SearchConstitutionsSchema, {
        query: longQuery,
      })).toThrow('Invalid tool arguments');
    });

    it('should accept query at max boundary', () => {
      const maxQuery = 'a'.repeat(200);
      const result = validateToolArgs(SearchConstitutionsSchema, {
        query: maxQuery,
      });
      expect(result.query).toBe(maxQuery);
    });

    it('should validate persona ID format when provided', () => {
      expect(() => validateToolArgs(SearchConstitutionsSchema, {
        query: 'test',
        personaId: 'invalid space',
      })).toThrow('Invalid tool arguments');
    });
  });

  describe('AdjudicateSchema', () => {
    it('should accept valid adjudication request', () => {
      const result = validateToolArgs(AdjudicateSchema, {
        question: 'Is this safe?',
        personaId: 'sentinel',
      });
      expect(result.question).toBe('Is this safe?');
      expect(result.personaId).toBe('sentinel');
    });

    it('should apply defaults', () => {
      const result = validateToolArgs(AdjudicateSchema, {
        question: 'Test question',
      });
      expect(result.personaId).toBe('ambassador');
      expect(result.context).toBeUndefined();
    });

    it('should reject empty question', () => {
      expect(() => validateToolArgs(AdjudicateSchema, { question: '' }))
        .toThrow('Invalid tool arguments');
    });

    it('should reject question exceeding max length', () => {
      const longQuestion = 'a'.repeat(10001);
      expect(() => validateToolArgs(AdjudicateSchema, {
        question: longQuestion,
      })).toThrow('Invalid tool arguments');
    });

    it('should accept question at max boundary', () => {
      const maxQuestion = 'a'.repeat(10000);
      const result = validateToolArgs(AdjudicateSchema, {
        question: maxQuestion,
      });
      expect(result.question).toBe(maxQuestion);
    });

    it('should validate context adherence level bounds', () => {
      const result = validateToolArgs(AdjudicateSchema, {
        question: 'Test',
        context: { adherenceLevel: 5 },
      });
      expect(result.context?.adherenceLevel).toBe(5);

      expect(() => validateToolArgs(AdjudicateSchema, {
        question: 'Test',
        context: { adherenceLevel: 0 },
      })).toThrow('Invalid tool arguments');

      expect(() => validateToolArgs(AdjudicateSchema, {
        question: 'Test',
        context: { adherenceLevel: 6 },
      })).toThrow('Invalid tool arguments');
    });

    it('should apply context default adherence level', () => {
      const result = validateToolArgs(AdjudicateSchema, {
        question: 'Test',
        context: {},
      });
      expect(result.context?.adherenceLevel).toBe(3);
    });

    it('should validate influence scope enum', () => {
      const validScopes = ['advise_only', 'compare_options', 'motivate_with_disclosure'] as const;
      validScopes.forEach(scope => {
        const result = validateToolArgs(AdjudicateSchema, {
          question: 'Test',
          context: { influenceScope: scope },
        });
        expect(result.context?.influenceScope).toBe(scope);
      });
    });

    it('should reject invalid influence scope', () => {
      expect(() => validateToolArgs(AdjudicateSchema, {
        question: 'Test',
        context: { influenceScope: 'invalid' as any },
      })).toThrow('Invalid tool arguments');
    });

    it('should apply context default influence scope', () => {
      const result = validateToolArgs(AdjudicateSchema, {
        question: 'Test',
        context: {},
      });
      expect(result.context?.influenceScope).toBe('advise_only');
    });

    it('should accept optional context fields', () => {
      const result = validateToolArgs(AdjudicateSchema, {
        question: 'Test',
        context: {
          constitutions: ['const-1', 'const-2'],
          userId: 'user-123',
          sessionId: 'session-456',
        },
      });
      expect(result.context?.constitutions).toEqual(['const-1', 'const-2']);
      expect(result.context?.userId).toBe('user-123');
      expect(result.context?.sessionId).toBe('session-456');
    });
  });

  describe('HeartbeatSchema', () => {
    it('should apply all defaults', () => {
      const result = validateToolArgs(HeartbeatSchema, {});
      expect(result.messageCount).toBe(0);
      expect(result.personaId).toBe('ambassador');
      expect(result.force).toBe(false);
    });

    it('should accept valid message count', () => {
      const result = validateToolArgs(HeartbeatSchema, { messageCount: 100 });
      expect(result.messageCount).toBe(100);
    });

    it('should reject negative message count', () => {
      expect(() => validateToolArgs(HeartbeatSchema, { messageCount: -1 }))
        .toThrow('Invalid tool arguments');
    });

    it('should accept zero message count', () => {
      const result = validateToolArgs(HeartbeatSchema, { messageCount: 0 });
      expect(result.messageCount).toBe(0);
    });

    it('should accept explicit values', () => {
      const result = validateToolArgs(HeartbeatSchema, {
        messageCount: 50,
        personaId: 'sentinel',
        force: true,
      });
      expect(result.messageCount).toBe(50);
      expect(result.personaId).toBe('sentinel');
      expect(result.force).toBe(true);
    });
  });

  describe('MultiScaleHandshakeSchema', () => {
    it('should accept valid parties array', () => {
      const result = validateToolArgs(MultiScaleHandshakeSchema, {
        parties: [
          { entityId: 'user-123', scale: 'micro' },
          { entityId: 'org-456', scale: 'meso' },
        ],
      });
      expect(result.parties).toHaveLength(2);
      expect(result.parties[0].entityId).toBe('user-123');
      expect(result.parties[0].scale).toBe('micro');
    });

    it('should reject empty parties array', () => {
      expect(() => validateToolArgs(MultiScaleHandshakeSchema, { parties: [] }))
        .toThrow('Invalid tool arguments');
    });

    it('should validate scale enum', () => {
      const validScales = ['micro', 'meso', 'macro'] as const;
      validScales.forEach(scale => {
        const result = validateToolArgs(MultiScaleHandshakeSchema, {
          parties: [{ entityId: 'test', scale }],
        });
        expect(result.parties[0].scale).toBe(scale);
      });
    });

    it('should reject invalid scale', () => {
      expect(() => validateToolArgs(MultiScaleHandshakeSchema, {
        parties: [{ entityId: 'test', scale: 'invalid' as any }],
      })).toThrow('Invalid tool arguments');
    });

    it('should apply default empty invariants', () => {
      const result = validateToolArgs(MultiScaleHandshakeSchema, {
        parties: [{ entityId: 'test', scale: 'macro' }],
      });
      expect(result.invariants).toEqual([]);
    });

    it('should accept optional capabilities', () => {
      const result = validateToolArgs(MultiScaleHandshakeSchema, {
        parties: [{
          entityId: 'test',
          scale: 'micro',
          capabilities: ['cap1', 'cap2'],
        }],
      });
      expect(result.parties[0].capabilities).toEqual(['cap1', 'cap2']);
    });

    it('should accept invariants array', () => {
      const result = validateToolArgs(MultiScaleHandshakeSchema, {
        parties: [{ entityId: 'test', scale: 'micro' }],
        invariants: ['inv1', 'inv2'],
      });
      expect(result.invariants).toEqual(['inv1', 'inv2']);
    });

    it('should reject empty entity ID', () => {
      expect(() => validateToolArgs(MultiScaleHandshakeSchema, {
        parties: [{ entityId: '', scale: 'micro' }],
      })).toThrow('Invalid tool arguments');
    });

    it('should accept multiple parties with mixed scales', () => {
      const result = validateToolArgs(MultiScaleHandshakeSchema, {
        parties: [
          { entityId: 'user-1', scale: 'micro', capabilities: ['read'] },
          { entityId: 'team-1', scale: 'meso', capabilities: ['write'] },
          { entityId: 'org-1', scale: 'macro' },
        ],
        invariants: ['ethical', 'transparent'],
      });
      expect(result.parties).toHaveLength(3);
      expect(result.invariants).toHaveLength(2);
    });
  });

  describe('GetScaleAttestationSchema', () => {
    it('should accept valid attestation request', () => {
      const result = validateToolArgs(GetScaleAttestationSchema, {
        entityId: 'user-123',
        scale: 'micro',
      });
      expect(result.entityId).toBe('user-123');
      expect(result.scale).toBe('micro');
      expect(result.includeChain).toBe(false);
    });

    it('should apply includeChain default', () => {
      const result = validateToolArgs(GetScaleAttestationSchema, {
        entityId: 'test',
        scale: 'meso',
      });
      expect(result.includeChain).toBe(false);
    });

    it('should accept includeChain true', () => {
      const result = validateToolArgs(GetScaleAttestationSchema, {
        entityId: 'test',
        scale: 'macro',
        includeChain: true,
      });
      expect(result.includeChain).toBe(true);
    });

    it('should validate scale enum', () => {
      const validScales = ['micro', 'meso', 'macro'] as const;
      validScales.forEach(scale => {
        const result = validateToolArgs(GetScaleAttestationSchema, {
          entityId: 'test',
          scale,
        });
        expect(result.scale).toBe(scale);
      });
    });

    it('should reject invalid scale', () => {
      expect(() => validateToolArgs(GetScaleAttestationSchema, {
        entityId: 'test',
        scale: 'nano' as any,
      })).toThrow('Invalid tool arguments');
    });

    it('should reject empty entity ID', () => {
      expect(() => validateToolArgs(GetScaleAttestationSchema, {
        entityId: '',
        scale: 'micro',
      })).toThrow('Invalid tool arguments');
    });
  });

  describe('validateToolArgs error handling', () => {
    it('should provide detailed error messages', () => {
      try {
        validateToolArgs(GetConstitutionSchema, { personaId: '' });
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Invalid tool arguments');
        expect(error.message).toContain('personaId');
      }
    });

    it('should handle multiple validation errors', () => {
      try {
        validateToolArgs(GetExportSchema, {
          personaId: '',
          format: 'invalid',
          constitutionIds: [],
        });
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Invalid tool arguments');
      }
    });

    it('should handle missing required fields', () => {
      try {
        validateToolArgs(AttestResponseSchema, {});
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Invalid tool arguments');
      }
    });

    it('should handle type mismatches', () => {
      try {
        validateToolArgs(HeartbeatSchema, { messageCount: 'not a number' });
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Invalid tool arguments');
      }
    });
  });
});
