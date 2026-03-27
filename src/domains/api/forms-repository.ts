import { nanoid } from 'nanoid'

import type { FormSchema } from '@/domains/schema/types'
import type { FormSummary, PersistedFormRecord } from '@/domains/api/forms-types'

export const FORMS_STORAGE_KEY = 'form-builder:forms:v1'

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const memoryStorage = new Map<string, string>()

const inMemoryStorage: StorageLike = {
  getItem(key) {
    return memoryStorage.get(key) ?? null
  },
  setItem(key, value) {
    memoryStorage.set(key, value)
  },
}

export class RepositoryError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'RepositoryError'
    this.status = status
  }
}

function defaultStorage(): StorageLike {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  return inMemoryStorage
}

function readRecords(storage: StorageLike): PersistedFormRecord[] {
  const raw = storage.getItem(FORMS_STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    return JSON.parse(raw) as PersistedFormRecord[]
  } catch {
    return []
  }
}

function writeRecords(storage: StorageLike, records: PersistedFormRecord[]) {
  storage.setItem(FORMS_STORAGE_KEY, JSON.stringify(records))
}

function toSummary(record: PersistedFormRecord): FormSummary {
  return {
    id: record.id,
    name: record.schema.form.name,
    version: record.version,
    savedAt: record.savedAt,
  }
}

function normalizeSchemaId(schema: FormSchema): string {
  if (schema.form.id.trim().length > 0) {
    return schema.form.id
  }
  return `form_${nanoid(8)}`
}

export function listPersistedForms(storage: StorageLike = defaultStorage()): FormSummary[] {
  return readRecords(storage)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .map(toSummary)
}

export function getPersistedFormById(
  id: string,
  storage: StorageLike = defaultStorage(),
): PersistedFormRecord {
  const record = readRecords(storage).find((item) => item.id === id)
  if (!record) {
    throw new RepositoryError(`Form ${id} not found`, 404)
  }
  return record
}

export function createPersistedForm(
  schema: FormSchema,
  storage: StorageLike = defaultStorage(),
): PersistedFormRecord {
  const records = readRecords(storage)
  const id = normalizeSchemaId(schema)

  if (records.some((item) => item.id === id)) {
    throw new RepositoryError(`Form ${id} already exists`, 409)
  }

  const now = new Date().toISOString()
  const record: PersistedFormRecord = {
    id,
    schema: {
      ...schema,
      form: {
        ...schema.form,
        id,
      },
    },
    version: 1,
    savedAt: now,
  }

  writeRecords(storage, [...records, record])
  return record
}

export function updatePersistedForm(
  id: string,
  schema: FormSchema,
  storage: StorageLike = defaultStorage(),
): PersistedFormRecord {
  const records = readRecords(storage)
  const index = records.findIndex((item) => item.id === id)
  if (index < 0) {
    throw new RepositoryError(`Form ${id} not found`, 404)
  }

  const previous = records[index]
  const next: PersistedFormRecord = {
    id,
    version: previous.version + 1,
    savedAt: new Date().toISOString(),
    schema: {
      ...schema,
      form: {
        ...schema.form,
        id,
      },
    },
  }

  const updated = [...records]
  updated[index] = next
  writeRecords(storage, updated)
  return next
}
