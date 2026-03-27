import type {
  FormSummary,
  PersistedFormRecord,
  SaveFormPayload,
} from '@/domains/api/forms-types'
import type { FormSchema } from '@/domains/schema/types'

class ApiClientError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const body = (await response.json()) as { message?: string }
      if (body.message) {
        message = body.message
      }
    } catch {
      // Ignore parse failures and keep default message.
    }
    throw new ApiClientError(message, response.status)
  }

  return (await response.json()) as T
}

export async function listForms(): Promise<FormSummary[]> {
  return requestJson<FormSummary[]>('/api/forms')
}

export async function getFormById(id: string): Promise<PersistedFormRecord> {
  return requestJson<PersistedFormRecord>(`/api/forms/${id}`)
}

export async function createForm(payload: SaveFormPayload): Promise<PersistedFormRecord> {
  return requestJson<PersistedFormRecord>('/api/forms', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateForm(id: string, schema: FormSchema): Promise<PersistedFormRecord> {
  return requestJson<PersistedFormRecord>(`/api/forms/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ schema }),
  })
}
