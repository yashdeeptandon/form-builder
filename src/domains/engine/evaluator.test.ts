import { describe, expect, it } from 'vitest'

import { compileFormSchema, evaluateCompiledSchema } from '@/domains/engine'
import type { FormSchema } from '@/domains/schema/types'

function createSchema(): FormSchema {
  return {
    schemaVersion: '1.0.0',
    form: {
      id: 'demo',
      name: 'Demo',
      settings: {
        saveProgress: true,
        clearHiddenValuesByDefault: true,
      },
      pages: [
        {
          id: 'page_1',
          title: 'Page 1',
          order: 1,
          visibility: { mode: 'always' },
          fields: [
            {
              id: 'q1',
              type: 'radio',
              label: 'Q1',
              required: true,
              options: [
                { label: 'Yes', value: 'yes' },
                { label: 'No', value: 'no' },
              ],
              visibility: { mode: 'always' },
              behaviors: { clearOnHide: true },
            },
            {
              id: 'q2',
              type: 'text',
              label: 'Q2',
              required: false,
              visibility: { mode: 'always' },
              behaviors: { clearOnHide: true },
            },
          ],
        },
        {
          id: 'page_2',
          title: 'Page 2',
          order: 2,
          visibility: { mode: 'always' },
          fields: [
            {
              id: 'q3',
              type: 'text',
              label: 'Q3',
              required: false,
              visibility: { mode: 'always' },
              behaviors: { clearOnHide: true },
            },
          ],
        },
      ],
      rules: [
        {
          id: 'rule_hide_q2',
          when: {
            all: [{ fact: 'q1', operator: 'equals', value: 'no' }],
          },
          then: [{ action: 'hideField', target: 'q2' }],
          else: [{ action: 'showField', target: 'q2' }],
        },
        {
          id: 'rule_skip_page',
          when: {
            all: [{ fact: 'q1', operator: 'equals', value: 'no' }],
          },
          then: [{ action: 'skipToPage', target: 'page_2' }],
        },
      ],
      navigation: {
        startPageId: 'page_1',
        strategy: 'sequential_with_skip',
      },
    },
  }
}

describe('evaluateCompiledSchema', () => {
  it('hides field and clears value when condition matches', () => {
    const schema = createSchema()
    const compiled = compileFormSchema(schema)

    const result = evaluateCompiledSchema(
      schema,
      compiled,
      {
        q1: 'no',
        q2: 'should clear',
      },
      'page_1',
    )

    expect(result.runtimePatch.visibleFieldIds.includes('q2')).toBe(false)
    expect(result.nextResponses.q2).toBeUndefined()
  })

  it('keeps field visible when condition does not match', () => {
    const schema = createSchema()
    const compiled = compileFormSchema(schema)

    const result = evaluateCompiledSchema(
      schema,
      compiled,
      {
        q1: 'yes',
      },
      'page_1',
    )

    expect(result.runtimePatch.visibleFieldIds.includes('q2')).toBe(true)
  })

  it('applies skip target when page is visible', () => {
    const schema = createSchema()
    const compiled = compileFormSchema(schema)

    const result = evaluateCompiledSchema(
      schema,
      compiled,
      {
        q1: 'no',
      },
      'page_1',
    )

    expect(result.nextCurrentPageId).toBe('page_2')
  })
})
