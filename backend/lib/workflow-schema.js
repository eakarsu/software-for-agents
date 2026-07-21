const Ajv = require('ajv');

const UUID_PATTERN = '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
const ROLES = ['viewer', 'operator', 'approver', 'admin'];

const answerSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['answer', 'citations', 'confidence', 'proposedAction'],
  properties: {
    answer: { type: 'string', minLength: 1, maxLength: 6000 },
    citations: {
      type: 'array',
      minItems: 1,
      maxItems: 12,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['documentId', 'quote'],
        properties: {
          documentId: { type: 'string', pattern: UUID_PATTERN },
          quote: { type: 'string', minLength: 1, maxLength: 800 }
        }
      }
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    proposedAction: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          required: ['connectorId', 'action', 'payload'],
          properties: {
            connectorId: { type: 'string', pattern: UUID_PATTERN },
            action: { const: 'create_case' },
            payload: {
              type: 'object',
              additionalProperties: false,
              required: ['summary', 'description', 'severity'],
              properties: {
                summary: { type: 'string', minLength: 1, maxLength: 180 },
                description: { type: 'string', minLength: 1, maxLength: 4000 },
                severity: { enum: ['low', 'medium', 'high', 'critical'] }
              }
            }
          }
        }
      ]
    }
  }
};

const syncSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cursor', 'documents'],
  properties: {
    cursor: { type: 'string', minLength: 1, maxLength: 500 },
    documents: {
      type: 'array',
      minItems: 1,
      maxItems: 100,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['sourceId', 'updatedAt', 'deleted'],
        properties: {
          sourceId: { type: 'string', minLength: 1, maxLength: 300 },
          updatedAt: { type: 'string', minLength: 20, maxLength: 40 },
          deleted: { type: 'boolean' },
          title: { type: 'string', minLength: 1, maxLength: 500 },
          content: { type: 'string', minLength: 1, maxLength: 50000 },
          sourceUrl: { type: 'string', maxLength: 2000 },
          allowedRoles: {
            type: 'array',
            minItems: 1,
            uniqueItems: true,
            items: { enum: ROLES }
          }
        },
        allOf: [{
          if: { properties: { deleted: { const: false } }, required: ['deleted'] },
          then: { required: ['title', 'content', 'allowedRoles'] }
        }]
      }
    }
  }
};

const ajv = new Ajv({ allErrors: true, strict: true, strictRequired: false });
const validateAnswer = ajv.compile(answerSchema);
const validateSync = ajv.compile(syncSchema);

function validationErrors(validate) {
  return (validate.errors || []).map((error) => ({
    path: error.instancePath || '/',
    keyword: error.keyword,
    message: error.message
  }));
}

module.exports = {
  UUID_PATTERN,
  ROLES,
  answerSchema,
  validateAnswer,
  validateSync,
  validationErrors
};
