import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { nanoid } from 'nanoid'

import { initialFormSchema } from '@/domains/schema/sample-schema'
import type {
  FieldSchema,
  FormMetadata,
  FormNavigation,
  FormSchema,
  FormSettings,
  RuleCondition,
  RuleSchema,
  Visibility,
} from '@/domains/schema/types'

export type SelectedNode =
  | { kind: 'none'; id: null }
  | { kind: 'page'; id: string }
  | { kind: 'field'; id: string }
  | { kind: 'rule'; id: string }

interface NormalizedPage {
  id: string
  title: string
  visibility: Visibility
  fieldIds: string[]
}

export interface BuilderWarning {
  id: string
  code: 'page-referenced' | 'field-referenced' | 'last-page'
  message: string
  references: string[]
}

export interface BuilderState {
  schemaVersion: string
  metadata: FormMetadata
  settings: FormSettings
  navigation: FormNavigation
  pagesById: Record<string, NormalizedPage>
  fieldsById: Record<string, FieldSchema>
  rulesById: Record<string, RuleSchema>
  pageOrder: string[]
  ruleOrder: string[]
  selectedNode: SelectedNode
  warnings: BuilderWarning[]
}

interface RemovePagePayload {
  pageId: string
  force?: boolean
}

interface RemoveFieldPayload {
  pageId: string
  fieldId: string
  force?: boolean
}

interface UpsertPagePayload {
  id: string
  title: string
  visibility: Visibility
}

interface ReorderPayload {
  sourceIndex: number
  targetIndex: number
}

interface ReorderFieldsPayload extends ReorderPayload {
  pageId: string
}

function normalizeSchema(schema: FormSchema): Omit<BuilderState, 'selectedNode' | 'warnings'> {
  const pagesById: Record<string, NormalizedPage> = {}
  const fieldsById: Record<string, FieldSchema> = {}
  const rulesById: Record<string, RuleSchema> = {}

  const pageOrder = [...schema.form.pages]
    .sort((a, b) => a.order - b.order)
    .map((page) => page.id)

  schema.form.pages.forEach((page) => {
    const fieldIds = page.fields.map((field) => field.id)
    pagesById[page.id] = {
      id: page.id,
      title: page.title,
      visibility: page.visibility,
      fieldIds,
    }

    page.fields.forEach((field) => {
      fieldsById[field.id] = field
    })
  })

  const ruleOrder = schema.form.rules.map((rule) => rule.id)
  schema.form.rules.forEach((rule) => {
    rulesById[rule.id] = rule
  })

  return {
    schemaVersion: schema.schemaVersion,
    metadata: {
      id: schema.form.id,
      name: schema.form.name,
      description: schema.form.description,
    },
    settings: schema.form.settings,
    navigation: schema.form.navigation,
    pagesById,
    fieldsById,
    rulesById,
    pageOrder,
    ruleOrder,
  }
}

interface UpdateFormMetadataPayload {
  id?: string
  name?: string
  description?: string
}

interface UpsertFieldPayload {
  pageId: string
  field: FieldSchema
}

function extractFacts(condition: RuleCondition, out: Set<string>) {
  if ('fact' in condition) {
    out.add(condition.fact)
    return
  }

  if ('all' in condition) {
    condition.all.forEach((item) => extractFacts(item, out))
    return
  }

  if ('any' in condition) {
    condition.any.forEach((item) => extractFacts(item, out))
  }
}

function ruleReferencesFact(rule: RuleSchema, fieldId: string): boolean {
  const facts = new Set<string>()
  extractFacts(rule.when, facts)
  return facts.has(fieldId)
}

function ruleReferencesTarget(rule: RuleSchema, targetId: string): boolean {
  return [...rule.then, ...(rule.else ?? [])].some((action) => action.target === targetId)
}

function getRuleIds(state: BuilderState): string[] {
  return state.ruleOrder.filter((id) => Boolean(state.rulesById[id]))
}

function collectFieldDependencyRules(state: BuilderState, fieldId: string): string[] {
  return getRuleIds(state).filter((ruleId) => {
    const rule = state.rulesById[ruleId]
    return ruleReferencesFact(rule, fieldId) || ruleReferencesTarget(rule, fieldId)
  })
}

function collectPageDependencyRules(state: BuilderState, pageId: string): string[] {
  return getRuleIds(state).filter((ruleId) => {
    const rule = state.rulesById[ruleId]
    return ruleReferencesTarget(rule, pageId)
  })
}

function pushWarning(
  state: BuilderState,
  code: BuilderWarning['code'],
  message: string,
  references: string[],
) {
  state.warnings.push({
    id: `warn_${nanoid(8)}`,
    code,
    message,
    references,
  })
}

function removeRulesByPredicate(
  state: BuilderState,
  shouldRemove: (rule: RuleSchema) => boolean,
) {
  const toRemove = getRuleIds(state).filter((ruleId) => shouldRemove(state.rulesById[ruleId]))
  if (toRemove.length === 0) {
    return
  }

  toRemove.forEach((ruleId) => {
    delete state.rulesById[ruleId]
  })
  state.ruleOrder = state.ruleOrder.filter((ruleId) => !toRemove.includes(ruleId))
}

function moveItem<T>(items: T[], sourceIndex: number, targetIndex: number): T[] {
  if (
    sourceIndex < 0 ||
    targetIndex < 0 ||
    sourceIndex >= items.length ||
    targetIndex >= items.length
  ) {
    return items
  }

  const next = [...items]
  const [value] = next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, value)
  return next
}

const normalizedSeed = normalizeSchema(initialFormSchema)

const initialState: BuilderState = {
  ...normalizedSeed,
  selectedNode: { kind: 'none', id: null },
  warnings: [],
}

export const builderSlice = createSlice({
  name: 'builder',
  initialState,
  reducers: {
    setSchema(state, action: PayloadAction<FormSchema>) {
      const normalized = normalizeSchema(action.payload)
      state.schemaVersion = normalized.schemaVersion
      state.metadata = normalized.metadata
      state.settings = normalized.settings
      state.navigation = normalized.navigation
      state.pagesById = normalized.pagesById
      state.fieldsById = normalized.fieldsById
      state.rulesById = normalized.rulesById
      state.pageOrder = normalized.pageOrder
      state.ruleOrder = normalized.ruleOrder
      state.selectedNode = { kind: 'none', id: null }
      state.warnings = []
    },
    updateFormMetadata(state, action: PayloadAction<UpdateFormMetadataPayload>) {
      state.metadata = {
        ...state.metadata,
        ...action.payload,
      }
    },
    addPage: {
      reducer(state, action: PayloadAction<{ id: string; title: string }>) {
        state.pagesById[action.payload.id] = {
          id: action.payload.id,
          title: action.payload.title,
          visibility: { mode: 'always' },
          fieldIds: [],
        }
        state.pageOrder.push(action.payload.id)
      },
      prepare(payload?: { title?: string }) {
        return {
          payload: {
            id: `page_${nanoid(6)}`,
            title: payload?.title ?? 'Untitled Page',
          },
        }
      },
    },
    upsertPage(state, action: PayloadAction<UpsertPagePayload>) {
      const existing = state.pagesById[action.payload.id]
      if (!existing) {
        state.pagesById[action.payload.id] = {
          id: action.payload.id,
          title: action.payload.title,
          visibility: action.payload.visibility,
          fieldIds: [],
        }
        state.pageOrder.push(action.payload.id)
      } else {
        existing.title = action.payload.title
        existing.visibility = action.payload.visibility
      }
    },
    reorderPages(state, action: PayloadAction<ReorderPayload>) {
      state.pageOrder = moveItem(
        state.pageOrder,
        action.payload.sourceIndex,
        action.payload.targetIndex,
      )
    },
    removePage(state, action: PayloadAction<RemovePagePayload>) {
      const page = state.pagesById[action.payload.pageId]
      if (!page) {
        return
      }

      if (state.pageOrder.length <= 1) {
        pushWarning(
          state,
          'last-page',
          'At least one page is required. Deleting the last page is blocked.',
          [action.payload.pageId],
        )
        return
      }

      const pageRefs = collectPageDependencyRules(state, action.payload.pageId)
      const fieldRefs = page.fieldIds.flatMap((fieldId) =>
        collectFieldDependencyRules(state, fieldId),
      )
      const allRefs = [...new Set([...pageRefs, ...fieldRefs])]

      if (allRefs.length > 0 && !action.payload.force) {
        pushWarning(
          state,
          'page-referenced',
          `Page ${action.payload.pageId} is referenced by rules. Delete with force after resolving dependencies.`,
          allRefs,
        )
        return
      }

      if (allRefs.length > 0 && action.payload.force) {
        const fieldsOnPage = new Set(page.fieldIds)
        removeRulesByPredicate(
          state,
          (rule) =>
            ruleReferencesTarget(rule, action.payload.pageId) ||
            [...fieldsOnPage].some((fieldId) =>
              ruleReferencesFact(rule, fieldId) || ruleReferencesTarget(rule, fieldId),
            ),
        )
      }

      page.fieldIds.forEach((fieldId) => {
        delete state.fieldsById[fieldId]
      })

      delete state.pagesById[action.payload.pageId]
      state.pageOrder = state.pageOrder.filter((pageId) => pageId !== action.payload.pageId)

      if (state.navigation.startPageId === action.payload.pageId) {
        const fallback = state.pageOrder[0]
        if (fallback) {
          state.navigation.startPageId = fallback
        }
      }

      if (state.selectedNode.id === action.payload.pageId) {
        state.selectedNode = { kind: 'none', id: null }
      }
    },
    addField: {
      reducer(
        state,
        action: PayloadAction<{ pageId: string; field: FieldSchema }>,
      ) {
        const page = state.pagesById[action.payload.pageId]
        if (!page) {
          return
        }

        state.fieldsById[action.payload.field.id] = action.payload.field
        page.fieldIds.push(action.payload.field.id)
      },
      prepare(payload: { pageId: string; type?: FieldSchema['type']; label?: string }) {
        const fieldType = payload.type ?? 'text'
        const fieldId = `field_${nanoid(6)}`
        return {
          payload: {
            pageId: payload.pageId,
            field: {
              id: fieldId,
              type: fieldType,
              label: payload.label ?? 'Untitled Field',
              required: false,
              defaultValue: fieldType === 'checkbox' || fieldType === 'toggle' ? false : '',
              options:
                fieldType === 'dropdown' ||
                fieldType === 'multiSelect' ||
                fieldType === 'radio' ||
                fieldType === 'checkboxGroup'
                  ? [
                      { label: 'Option 1', value: 'option_1' },
                      { label: 'Option 2', value: 'option_2' },
                    ]
                  : undefined,
              visibility: { mode: 'always' },
              behaviors: { clearOnHide: true },
            } satisfies FieldSchema,
          },
        }
      },
    },
    upsertField(state, action: PayloadAction<UpsertFieldPayload>) {
      const page = state.pagesById[action.payload.pageId]
      if (!page) {
        return
      }

      const exists = Boolean(state.fieldsById[action.payload.field.id])
      state.fieldsById[action.payload.field.id] = action.payload.field

      if (!exists && !page.fieldIds.includes(action.payload.field.id)) {
        page.fieldIds.push(action.payload.field.id)
      }
    },
    removeField(state, action: PayloadAction<RemoveFieldPayload>) {
      const page = state.pagesById[action.payload.pageId]
      if (!page) {
        return
      }

      const refs = collectFieldDependencyRules(state, action.payload.fieldId)
      if (refs.length > 0 && !action.payload.force) {
        pushWarning(
          state,
          'field-referenced',
          `Field ${action.payload.fieldId} is referenced by rules. Delete with force after resolving dependencies.`,
          refs,
        )
        return
      }

      if (refs.length > 0 && action.payload.force) {
        removeRulesByPredicate(
          state,
          (rule) =>
            ruleReferencesFact(rule, action.payload.fieldId) ||
            ruleReferencesTarget(rule, action.payload.fieldId),
        )
      }

      page.fieldIds = page.fieldIds.filter((fieldId) => fieldId !== action.payload.fieldId)
      delete state.fieldsById[action.payload.fieldId]

      if (state.selectedNode.id === action.payload.fieldId) {
        state.selectedNode = { kind: 'none', id: null }
      }
    },
    reorderFields(state, action: PayloadAction<ReorderFieldsPayload>) {
      const page = state.pagesById[action.payload.pageId]
      if (!page) {
        return
      }

      page.fieldIds = moveItem(
        page.fieldIds,
        action.payload.sourceIndex,
        action.payload.targetIndex,
      )
    },
    reorderRules(state, action: PayloadAction<ReorderPayload>) {
      state.ruleOrder = moveItem(
        state.ruleOrder,
        action.payload.sourceIndex,
        action.payload.targetIndex,
      )
    },
    upsertRule(state, action: PayloadAction<RuleSchema>) {
      const exists = Boolean(state.rulesById[action.payload.id])
      state.rulesById[action.payload.id] = action.payload
      if (!exists) {
        state.ruleOrder.push(action.payload.id)
      }
    },
    removeRule(state, action: PayloadAction<string>) {
      delete state.rulesById[action.payload]
      state.ruleOrder = state.ruleOrder.filter((ruleId) => ruleId !== action.payload)
    },
    selectNode(state, action: PayloadAction<SelectedNode>) {
      state.selectedNode = action.payload
    },
    clearWarnings(state) {
      state.warnings = []
    },
    resetBuilderState() {
      return initialState
    },
  },
})

export const {
  setSchema,
  updateFormMetadata,
  addPage,
  upsertPage,
  reorderPages,
  removePage,
  addField,
  upsertField,
  removeField,
  reorderFields,
  reorderRules,
  upsertRule,
  removeRule,
  selectNode,
  clearWarnings,
  resetBuilderState,
} = builderSlice.actions

export default builderSlice.reducer
