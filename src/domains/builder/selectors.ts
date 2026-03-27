import { createSelector } from '@reduxjs/toolkit'

import type { RootState } from '@/app/store'
import type { FormSchema, PageSchema } from '@/domains/schema/types'

const selectBuilderState = (state: RootState) => state.builder

export const selectFormMetadata = createSelector([selectBuilderState], (builder) => ({
  id: builder.metadata.id,
  name: builder.metadata.name,
  description: builder.metadata.description,
}))

export const selectPagesInOrder = createSelector([selectBuilderState], (builder) => {
  const pages: PageSchema[] = builder.pageOrder
    .map((pageId, index) => {
      const page = builder.pagesById[pageId]
      if (!page) {
        return null
      }

      return {
        id: page.id,
        title: page.title,
        order: index + 1,
        visibility: page.visibility,
        fields: page.fieldIds
          .map((fieldId) => builder.fieldsById[fieldId])
          .filter((field): field is NonNullable<typeof field> => Boolean(field)),
      }
    })
    .filter((page): page is PageSchema => Boolean(page))

  return pages
})

export const selectAllFields = createSelector([selectPagesInOrder], (pages) =>
  pages.flatMap((page) => page.fields),
)

export const selectRules = createSelector([selectBuilderState], (builder) =>
  builder.ruleOrder
    .map((ruleId) => builder.rulesById[ruleId])
    .filter((rule): rule is NonNullable<typeof rule> => Boolean(rule)),
)

export const selectSchema = createSelector(
  [selectBuilderState, selectPagesInOrder, selectRules],
  (builder, pages, rules): FormSchema => ({
    schemaVersion: builder.schemaVersion,
    form: {
      id: builder.metadata.id,
      name: builder.metadata.name,
      description: builder.metadata.description,
      settings: builder.settings,
      pages,
      rules,
      navigation: builder.navigation,
    },
  }),
)

export const selectBuilderWarnings = createSelector(
  [selectBuilderState],
  (builder) => builder.warnings,
)
