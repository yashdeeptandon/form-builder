import { describe, expect, it } from 'vitest'

import { initialFormSchema } from '@/domains/schema/sample-schema'
import type { FormSchema } from '@/domains/schema/types'
import { compileFormSchema } from '@/domains/engine/compiler'

function cloneSchema(schema: FormSchema): FormSchema {
  return JSON.parse(JSON.stringify(schema)) as FormSchema
}

describe('compileFormSchema', () => {
  it('compiles valid base schema without errors', () => {
    const compiled = compileFormSchema(initialFormSchema)

    expect(compiled.hasErrors).toBe(false)
    expect(compiled.diagnostics).toHaveLength(0)
  })

  it('reports unknown target references', () => {
    const schema = cloneSchema(initialFormSchema)

    schema.form.rules.push({
      id: 'rule_1',
      when: {
        all: [{ fact: 'field_1', operator: 'equals', value: 'x' }],
      },
      then: [{ action: 'showField', target: 'missing_field' }],
    })

    const compiled = compileFormSchema(schema)

    expect(compiled.hasErrors).toBe(true)
    expect(compiled.diagnostics.some((item) => item.code === 'unknown-target')).toBe(true)
  })

  it('reports operator mismatch for incompatible field type', () => {
    const schema = cloneSchema(initialFormSchema)

    schema.form.pages[0].fields[0].type = 'toggle'
    schema.form.rules.push({
      id: 'rule_2',
      when: {
        all: [{ fact: 'field_1', operator: 'greaterThan', value: 2 }],
      },
      then: [{ action: 'showField', target: 'field_1' }],
    })

    const compiled = compileFormSchema(schema)

    expect(compiled.hasErrors).toBe(true)
    expect(
      compiled.diagnostics.some((item) => item.code === 'operator-type-mismatch'),
    ).toBe(true)
  })

  it('detects rule dependency cycle between fields', () => {
    const schema = cloneSchema(initialFormSchema)

    schema.form.pages[0].fields.push({
      id: 'field_2',
      type: 'text',
      label: 'Second field',
      required: false,
      defaultValue: '',
      visibility: { mode: 'always' },
      behaviors: { clearOnHide: true },
    })

    schema.form.rules.push(
      {
        id: 'rule_a',
        when: {
          all: [{ fact: 'field_1', operator: 'equals', value: 'show' }],
        },
        then: [{ action: 'showField', target: 'field_2' }],
      },
      {
        id: 'rule_b',
        when: {
          all: [{ fact: 'field_2', operator: 'equals', value: 'show' }],
        },
        then: [{ action: 'showField', target: 'field_1' }],
      },
    )

    const compiled = compileFormSchema(schema)

    expect(compiled.hasErrors).toBe(true)
    expect(compiled.diagnostics.some((item) => item.code === 'cycle-detected')).toBe(true)
  })
})
