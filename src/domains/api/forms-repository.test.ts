import { describe, expect, it } from 'vitest'

import {
  createPersistedForm,
  getPersistedFormById,
  listPersistedForms,
  RepositoryError,
  updatePersistedForm,
} from '@/domains/api/forms-repository'
import type { FormSchema } from '@/domains/schema/types'

function createStorage() {
  const map = new Map<string, string>()
  return {
    getItem(key: string) {
      return map.get(key) ?? null
    },
    setItem(key: string, value: string) {
      map.set(key, value)
    },
  }
}

function createSchema(id: string, name = 'Form'): FormSchema {
  return {
    schemaVersion: '1.0.0',
    form: {
      id,
      name,
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
              id: 'field_1',
              type: 'text',
              label: 'Field',
              required: false,
              visibility: { mode: 'always' },
              behaviors: { clearOnHide: true },
            },
          ],
        },
      ],
      rules: [],
      navigation: {
        startPageId: 'page_1',
        strategy: 'sequential_with_skip',
      },
    },
  }
}

describe('forms-repository', () => {
  it('creates and lists persisted forms', () => {
    const storage = createStorage()

    const created = createPersistedForm(createSchema('form_1', 'First Form'), storage)

    expect(created.id).toBe('form_1')
    expect(created.version).toBe(1)

    const list = listPersistedForms(storage)
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('form_1')
    expect(list[0].name).toBe('First Form')
  })

  it('updates form and increments version', () => {
    const storage = createStorage()
    createPersistedForm(createSchema('form_1', 'Before Update'), storage)

    const updated = updatePersistedForm(
      'form_1',
      createSchema('form_1', 'After Update'),
      storage,
    )

    expect(updated.version).toBe(2)
    expect(updated.schema.form.name).toBe('After Update')

    const fetched = getPersistedFormById('form_1', storage)
    expect(fetched.version).toBe(2)
    expect(fetched.schema.form.name).toBe('After Update')
  })

  it('throws conflict for duplicate create', () => {
    const storage = createStorage()
    createPersistedForm(createSchema('form_1'), storage)

    expect(() => createPersistedForm(createSchema('form_1'), storage)).toThrowError(
      RepositoryError,
    )
  })
})
