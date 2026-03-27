import type { FormSchema } from '@/domains/schema/types'

export interface PersistedFormRecord {
  id: string
  schema: FormSchema
  version: number
  savedAt: string
}

export interface FormSummary {
  id: string
  name: string
  version: number
  savedAt: string
}

export interface SaveFormPayload {
  schema: FormSchema
}
