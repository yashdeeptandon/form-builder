import { delay, http, HttpResponse } from 'msw'

import {
  createPersistedForm,
  getPersistedFormById,
  listPersistedForms,
  RepositoryError,
  updatePersistedForm,
} from '@/domains/api/forms-repository'
import type { FormSchema } from '@/domains/schema/types'
import { validateFormSchema } from '@/domains/schema/validators'

function getFailureRate(): number {
  const raw = import.meta.env.VITE_MOCK_API_FAILURE_RATE
  if (!raw) {
    return 0.05
  }

  const parsed = Number(raw)
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
    return 0.05
  }

  return parsed
}

async function applyNetworkSimulation() {
  const ms = 300 + Math.floor(Math.random() * 900)
  await delay(ms)

  if (Math.random() < getFailureRate()) {
    return HttpResponse.json(
      {
        message: 'Mock API failure occurred. Please retry.',
      },
      { status: 500 },
    )
  }

  return null
}

export const handlers = [
  http.get('/api/forms', async () => {
    const simulatedFailure = await applyNetworkSimulation()
    if (simulatedFailure) {
      return simulatedFailure
    }

    return HttpResponse.json(listPersistedForms())
  }),

  http.get('/api/forms/:id', async ({ params }) => {
    const simulatedFailure = await applyNetworkSimulation()
    if (simulatedFailure) {
      return simulatedFailure
    }

    const id = String(params.id)
    try {
      return HttpResponse.json(getPersistedFormById(id))
    } catch (error) {
      if (error instanceof RepositoryError) {
        return HttpResponse.json({ message: error.message }, { status: error.status })
      }
      return HttpResponse.json({ message: 'Unknown repository error' }, { status: 500 })
    }
  }),

  http.post('/api/forms', async ({ request }) => {
    const simulatedFailure = await applyNetworkSimulation()
    if (simulatedFailure) {
      return simulatedFailure
    }

    try {
      const body = (await request.json()) as unknown
      const candidate =
        typeof body === 'object' && body !== null && 'schema' in body
          ? (body as { schema: unknown }).schema
          : body
      const schema = validateFormSchema(candidate) as FormSchema
      return HttpResponse.json(createPersistedForm(schema), { status: 201 })
    } catch (error) {
      if (error instanceof RepositoryError) {
        return HttpResponse.json({ message: error.message }, { status: error.status })
      }
      return HttpResponse.json({ message: 'Invalid schema payload' }, { status: 400 })
    }
  }),

  http.put('/api/forms/:id', async ({ params, request }) => {
    const simulatedFailure = await applyNetworkSimulation()
    if (simulatedFailure) {
      return simulatedFailure
    }

    const id = String(params.id)

    try {
      const body = (await request.json()) as unknown
      const candidate =
        typeof body === 'object' && body !== null && 'schema' in body
          ? (body as { schema: unknown }).schema
          : body
      const schema = validateFormSchema(candidate) as FormSchema
      return HttpResponse.json(updatePersistedForm(id, schema))
    } catch (error) {
      if (error instanceof RepositoryError) {
        return HttpResponse.json({ message: error.message }, { status: error.status })
      }
      return HttpResponse.json({ message: 'Invalid schema payload' }, { status: 400 })
    }
  }),
]
