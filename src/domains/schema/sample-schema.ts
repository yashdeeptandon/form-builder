import type { FormSchema } from '@/domains/schema/types'

export const initialFormSchema: FormSchema = {
  schemaVersion: '1.0.0',
  form: {
    id: 'form_builder_seed',
    name: 'Untitled Form',
    description: 'Starter schema for the builder runtime',
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
            label: 'Your answer',
            required: false,
            defaultValue: '',
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
