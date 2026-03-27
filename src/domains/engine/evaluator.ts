import type { CompiledSchema } from '@/domains/engine/compiler'
import type {
  FieldSchema,
  FormSchema,
  Operator,
  RuleAction,
  RuleCondition,
} from '@/domains/schema/types'

interface QueuedAction {
  action: RuleAction
  priority: number
  order: number
  actionIndex: number
}

interface EvaluationContext {
  responses: Record<string, unknown>
}

export interface RuntimeEvaluationResult {
  runtimePatch: {
    visibleFieldIds: string[]
    visiblePageIds: string[]
    requiredOverrides: Record<string, boolean>
    hiddenReasonByTarget: Record<string, string>
  }
  nextResponses: Record<string, unknown>
  nextCurrentPageId: string | null
}

const ACTION_PRECEDENCE: Record<RuleAction['action'], number> = {
  showField: 1,
  hideField: 1,
  showPage: 2,
  hidePage: 2,
  setRequired: 3,
  clearValue: 4,
  skipToPage: 5,
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true
  }

  if (typeof value === 'string') {
    return value.trim().length === 0
  }

  if (Array.isArray(value)) {
    return value.length === 0
  }

  return false
}

function toComparableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const asDate = Date.parse(value)
    if (!Number.isNaN(asDate)) {
      return asDate
    }

    const asNumber = Number(value)
    if (!Number.isNaN(asNumber)) {
      return asNumber
    }
  }

  return null
}

function evaluateOperator(operator: Operator, left: unknown, right: unknown): boolean {
  switch (operator) {
    case 'equals':
      return left === right
    case 'notEquals':
      return left !== right
    case 'contains': {
      if (typeof left === 'string') {
        return typeof right === 'string' ? left.includes(right) : false
      }
      if (Array.isArray(left)) {
        return left.includes(right)
      }
      return false
    }
    case 'notContains': {
      if (typeof left === 'string') {
        return typeof right === 'string' ? !left.includes(right) : true
      }
      if (Array.isArray(left)) {
        return !left.includes(right)
      }
      return true
    }
    case 'isEmpty':
      return isEmptyValue(left)
    case 'isNotEmpty':
      return !isEmptyValue(left)
    case 'greaterThan': {
      const leftNumber = toComparableNumber(left)
      const rightNumber = toComparableNumber(right)
      if (leftNumber === null || rightNumber === null) {
        return false
      }
      return leftNumber > rightNumber
    }
    case 'lessThan': {
      const leftNumber = toComparableNumber(left)
      const rightNumber = toComparableNumber(right)
      if (leftNumber === null || rightNumber === null) {
        return false
      }
      return leftNumber < rightNumber
    }
    default:
      return false
  }
}

function evaluateCondition(condition: RuleCondition, context: EvaluationContext): boolean {
  if ('fact' in condition) {
    const left = context.responses[condition.fact]
    return evaluateOperator(condition.operator, left, condition.value)
  }

  if ('all' in condition) {
    return condition.all.every((child) => evaluateCondition(child, context))
  }

  if ('any' in condition) {
    return condition.any.some((child) => evaluateCondition(child, context))
  }

  return false
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)]
}

function sortActions(queue: QueuedAction[]): QueuedAction[] {
  return [...queue].sort((a, b) => {
    const precedenceA = ACTION_PRECEDENCE[a.action.action]
    const precedenceB = ACTION_PRECEDENCE[b.action.action]
    if (precedenceA !== precedenceB) {
      return precedenceA - precedenceB
    }

    if (a.priority !== b.priority) {
      return a.priority - b.priority
    }

    if (a.order !== b.order) {
      return a.order - b.order
    }

    return a.actionIndex - b.actionIndex
  })
}

function buildFieldAndPageMaps(schema: FormSchema): {
  fieldsById: Record<string, FieldSchema>
  fieldToPageId: Record<string, string>
  pageIds: string[]
  pageOrder: string[]
} {
  const fieldsById: Record<string, FieldSchema> = {}
  const fieldToPageId: Record<string, string> = {}
  const pageIds: string[] = []

  const sortedPages = [...schema.form.pages].sort((a, b) => a.order - b.order)
  sortedPages.forEach((page) => {
    pageIds.push(page.id)
    page.fields.forEach((field) => {
      fieldsById[field.id] = field
      fieldToPageId[field.id] = page.id
    })
  })

  return {
    fieldsById,
    fieldToPageId,
    pageIds,
    pageOrder: sortedPages.map((page) => page.id),
  }
}

export function evaluateCompiledSchema(
  schema: FormSchema,
  compiled: CompiledSchema,
  responses: Record<string, unknown>,
  currentPageId: string | null,
): RuntimeEvaluationResult {
  const { fieldsById, fieldToPageId, pageIds, pageOrder } = buildFieldAndPageMaps(schema)

  const visibleFields = new Set<string>()
  const visiblePages = new Set<string>()
  const requiredOverrides: Record<string, boolean> = {}
  const hiddenReasonByTarget: Record<string, string> = {}

  schema.form.pages.forEach((page) => {
    const pageVisibleByDefinition = page.visibility.mode === 'always'
    if (pageVisibleByDefinition) {
      visiblePages.add(page.id)
    }

    page.fields.forEach((field) => {
      const fieldVisibleByDefinition = field.visibility.mode === 'always'
      if (fieldVisibleByDefinition) {
        visibleFields.add(field.id)
      }
    })
  })

  const actionQueue: QueuedAction[] = []

  compiled.orderedRuleIds.forEach((ruleId) => {
    const compiledRule = compiled.compiledRulesById[ruleId]
    if (!compiledRule) {
      return
    }

    const conditionResult = evaluateCondition(compiledRule.raw.when, { responses })
    const actions = conditionResult
      ? compiledRule.raw.then
      : (compiledRule.raw.else ?? [])

    actions.forEach((action, actionIndex) => {
      actionQueue.push({
        action,
        priority: compiledRule.priority,
        order: compiledRule.order,
        actionIndex,
      })
    })
  })

  const clearTargetsFromActions = new Set<string>()
  let requestedPage: string | null = null

  sortActions(actionQueue).forEach(({ action }) => {
    switch (action.action) {
      case 'showField': {
        if (fieldsById[action.target]) {
          visibleFields.add(action.target)
          delete hiddenReasonByTarget[action.target]
        }
        break
      }
      case 'hideField': {
        if (fieldsById[action.target]) {
          visibleFields.delete(action.target)
          hiddenReasonByTarget[action.target] = 'hidden by rule action'
        }
        break
      }
      case 'showPage': {
        if (pageIds.includes(action.target)) {
          visiblePages.add(action.target)
          delete hiddenReasonByTarget[action.target]
        }
        break
      }
      case 'hidePage': {
        if (pageIds.includes(action.target)) {
          visiblePages.delete(action.target)
          hiddenReasonByTarget[action.target] = 'hidden by rule action'
        }
        break
      }
      case 'setRequired': {
        if (fieldsById[action.target] && typeof action.value === 'boolean') {
          requiredOverrides[action.target] = action.value
        }
        break
      }
      case 'clearValue': {
        if (fieldsById[action.target]) {
          clearTargetsFromActions.add(action.target)
        }
        break
      }
      case 'skipToPage': {
        if (pageIds.includes(action.target)) {
          requestedPage = action.target
        }
        break
      }
      default:
        break
    }
  })

  Object.entries(fieldToPageId).forEach(([fieldId, parentPageId]) => {
    if (!visiblePages.has(parentPageId)) {
      visibleFields.delete(fieldId)
      hiddenReasonByTarget[fieldId] = `hidden because page ${parentPageId} is not visible`
    }
  })

  const nextResponses = { ...responses }

  const clearHiddenValuesByDefault = schema.form.settings.clearHiddenValuesByDefault
  Object.entries(fieldsById).forEach(([fieldId, field]) => {
    const isVisible = visibleFields.has(fieldId)
    if (isVisible) {
      return
    }

    const clearOnHide = field.behaviors?.clearOnHide ?? clearHiddenValuesByDefault
    if (clearOnHide) {
      delete nextResponses[fieldId]
    }
  })

  clearTargetsFromActions.forEach((fieldId) => {
    delete nextResponses[fieldId]
  })

  const orderedVisiblePageIds = pageOrder.filter((pageId) => visiblePages.has(pageId))

  let nextCurrentPageId = currentPageId

  if (requestedPage && visiblePages.has(requestedPage)) {
    nextCurrentPageId = requestedPage
  }

  if (!nextCurrentPageId || !visiblePages.has(nextCurrentPageId)) {
    nextCurrentPageId = orderedVisiblePageIds[0] ?? null
  }

  return {
    runtimePatch: {
      visibleFieldIds: dedupe([...visibleFields]),
      visiblePageIds: orderedVisiblePageIds,
      requiredOverrides,
      hiddenReasonByTarget,
    },
    nextResponses,
    nextCurrentPageId,
  }
}
