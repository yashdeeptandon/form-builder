import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'

import {
  createForm,
  getFormById,
  listForms,
  updateForm,
} from '@/domains/api/forms-client'
import type {
  FormSummary,
  PersistedFormRecord,
  SaveFormPayload,
} from '@/domains/api/forms-types'
import type { FormSchema } from '@/domains/schema/types'

export const formsQueryKeys = {
  all: ['forms'] as const,
  detail: (id: string) => ['forms', id] as const,
}

export function useFormsListQuery(): UseQueryResult<FormSummary[], Error> {
  return useQuery({
    queryKey: formsQueryKeys.all,
    queryFn: listForms,
  })
}

export function useFormDetailQuery(
  id: string | null,
): UseQueryResult<PersistedFormRecord, Error> {
  return useQuery({
    queryKey: id ? formsQueryKeys.detail(id) : ['forms', 'idle'],
    queryFn: () => getFormById(id ?? ''),
    enabled: Boolean(id),
  })
}

export function useCreateFormMutation(): UseMutationResult<
  PersistedFormRecord,
  Error,
  SaveFormPayload
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createForm,
    onSuccess: (record) => {
      void queryClient.invalidateQueries({ queryKey: formsQueryKeys.all })
      queryClient.setQueryData(formsQueryKeys.detail(record.id), record)
    },
  })
}

export function useUpdateFormMutation(): UseMutationResult<
  PersistedFormRecord,
  Error,
  { id: string; schema: FormSchema }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, schema }) => updateForm(id, schema),
    onSuccess: (record) => {
      void queryClient.invalidateQueries({ queryKey: formsQueryKeys.all })
      queryClient.setQueryData(formsQueryKeys.detail(record.id), record)
    },
  })
}
