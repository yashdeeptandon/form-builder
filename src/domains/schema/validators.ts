import { z } from 'zod'

const fieldTypeSchema = z.enum([
  'text',
  'textarea',
  'number',
  'email',
  'phone',
  'date',
  'dropdown',
  'multiSelect',
  'radio',
  'checkbox',
  'checkboxGroup',
  'toggle',
])

const operatorSchema = z.enum([
  'equals',
  'notEquals',
  'contains',
  'notContains',
  'isEmpty',
  'isNotEmpty',
  'greaterThan',
  'lessThan',
])

const ruleActionTypeSchema = z.enum([
  'showField',
  'hideField',
  'showPage',
  'hidePage',
  'skipToPage',
  'setRequired',
  'clearValue',
])

const visibilitySchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('always') }),
  z.object({ mode: z.literal('conditional'), ruleRef: z.string().min(1) }),
])

const fieldOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
})

const fieldValidationSchema = z
  .object({
    minLength: z.number().int().nonnegative().optional(),
    maxLength: z.number().int().nonnegative().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().positive().optional(),
    minDate: z.string().optional(),
    maxDate: z.string().optional(),
    format: z.enum(['email', 'phone']).optional(),
    pattern: z.string().optional(),
    allowedValues: z.array(z.string()).optional(),
    minSelect: z.number().int().nonnegative().optional(),
    maxSelect: z.number().int().nonnegative().optional(),
    mustBeTrue: z.boolean().optional(),
    valueType: z.literal('boolean').optional(),
  })
  .optional()

const fieldSchema = z.object({
  id: z.string().min(1),
  type: fieldTypeSchema,
  label: z.string().min(1),
  required: z.boolean(),
  helperText: z.string().optional(),
  placeholder: z.string().optional(),
  defaultValue: z.unknown().optional(),
  options: z.array(fieldOptionSchema).optional(),
  validation: fieldValidationSchema,
  visibility: visibilitySchema,
  behaviors: z
    .object({
      clearOnHide: z.boolean(),
    })
    .optional(),
})

const pageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
  visibility: visibilitySchema,
  fields: z.array(fieldSchema),
})

const ruleConditionSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.object({
      fact: z.string().min(1),
      operator: operatorSchema,
      value: z.unknown().optional(),
    }),
    z.object({ all: z.array(ruleConditionSchema).min(1) }),
    z.object({ any: z.array(ruleConditionSchema).min(1) }),
  ]),
)

const ruleActionSchema = z.object({
  action: ruleActionTypeSchema,
  target: z.string().min(1),
  value: z.unknown().optional(),
})

const ruleSchema = z.object({
  id: z.string().min(1),
  priority: z.number().int().optional(),
  when: ruleConditionSchema,
  then: z.array(ruleActionSchema).min(1),
  else: z.array(ruleActionSchema).optional(),
})

export const formSchemaValidator = z.object({
  schemaVersion: z.string().min(1),
  form: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    settings: z.object({
      saveProgress: z.boolean(),
      clearHiddenValuesByDefault: z.boolean(),
    }),
    pages: z.array(pageSchema).min(1),
    rules: z.array(ruleSchema),
    navigation: z.object({
      startPageId: z.string().min(1),
      strategy: z.literal('sequential_with_skip'),
    }),
  }),
})

export type FormSchemaInput = z.input<typeof formSchemaValidator>
export type FormSchemaOutput = z.output<typeof formSchemaValidator>

export function validateFormSchema(input: unknown): FormSchemaOutput {
  return formSchemaValidator.parse(input)
}
