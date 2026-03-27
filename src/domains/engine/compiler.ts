import type {
  FieldType,
  FormSchema,
  Operator,
  RuleActionType,
  RuleCondition,
  RuleSchema,
} from '@/domains/schema/types'

export type DiagnosticSeverity = 'error' | 'warning'

export interface CompileDiagnostic {
  code:
    | 'missing-rule-reference'
    | 'unknown-fact'
    | 'unknown-target'
    | 'operator-type-mismatch'
    | 'cycle-detected'
  severity: DiagnosticSeverity
  message: string
  ruleId?: string
  targetId?: string
}

export interface CompiledRule {
  id: string
  priority: number
  order: number
  sourceFacts: string[]
  targets: string[]
  raw: RuleSchema
}

export interface CompiledSchema {
  dependencyIndex: Record<string, string[]>
  targetIndex: Record<string, string[]>
  orderedRuleIds: string[]
  compiledRulesById: Record<string, CompiledRule>
  diagnostics: CompileDiagnostic[]
  hasErrors: boolean
}

const FIELD_TARGET_ACTIONS = new Set<RuleActionType>([
  'showField',
  'hideField',
  'setRequired',
  'clearValue',
])

const PAGE_TARGET_ACTIONS = new Set<RuleActionType>([
  'showPage',
  'hidePage',
  'skipToPage',
])

const OPERATOR_COMPATIBILITY: Record<FieldType, Set<Operator>> = {
  text: new Set(['equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty']),
  textarea: new Set([
    'equals',
    'notEquals',
    'contains',
    'notContains',
    'isEmpty',
    'isNotEmpty',
  ]),
  number: new Set([
    'equals',
    'notEquals',
    'isEmpty',
    'isNotEmpty',
    'greaterThan',
    'lessThan',
  ]),
  email: new Set(['equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty']),
  phone: new Set(['equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty']),
  date: new Set([
    'equals',
    'notEquals',
    'isEmpty',
    'isNotEmpty',
    'greaterThan',
    'lessThan',
  ]),
  dropdown: new Set(['equals', 'notEquals', 'isEmpty', 'isNotEmpty']),
  multiSelect: new Set(['contains', 'notContains', 'isEmpty', 'isNotEmpty']),
  radio: new Set(['equals', 'notEquals', 'isEmpty', 'isNotEmpty']),
  checkbox: new Set(['equals', 'notEquals']),
  checkboxGroup: new Set(['contains', 'notContains', 'isEmpty', 'isNotEmpty']),
  toggle: new Set(['equals', 'notEquals']),
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

function validateOperatorCompatibility(
  fieldType: FieldType,
  operator: Operator,
): boolean {
  return OPERATOR_COMPATIBILITY[fieldType].has(operator)
}

function collectLeafConditions(condition: RuleCondition, out: Array<{ fact: string; operator: Operator }>) {
  if ('fact' in condition) {
    out.push({ fact: condition.fact, operator: condition.operator })
    return
  }

  if ('all' in condition) {
    condition.all.forEach((item) => collectLeafConditions(item, out))
    return
  }

  if ('any' in condition) {
    condition.any.forEach((item) => collectLeafConditions(item, out))
  }
}

function findCycles(graph: Record<string, Set<string>>): string[][] {
  const visited = new Set<string>()
  const inStack = new Set<string>()
  const path: string[] = []
  const cycles: string[][] = []

  function dfs(node: string) {
    visited.add(node)
    inStack.add(node)
    path.push(node)

    const nextNodes = graph[node] ?? new Set<string>()
    nextNodes.forEach((next) => {
      if (!visited.has(next)) {
        dfs(next)
        return
      }

      if (inStack.has(next)) {
        const startIndex = path.indexOf(next)
        if (startIndex >= 0) {
          const cycle = path.slice(startIndex)
          cycles.push(cycle)
        }
      }
    })

    path.pop()
    inStack.delete(node)
  }

  Object.keys(graph).forEach((node) => {
    if (!visited.has(node)) {
      dfs(node)
    }
  })

  return cycles
}

export function compileFormSchema(schema: FormSchema): CompiledSchema {
  const diagnostics: CompileDiagnostic[] = []
  const dependencyIndex: Record<string, string[]> = {}
  const targetIndex: Record<string, string[]> = {}
  const compiledRulesById: Record<string, CompiledRule> = {}

  const fieldTypeById: Record<string, FieldType> = {}
  const pageIds = new Set<string>()
  const ruleIds = new Set(schema.form.rules.map((rule) => rule.id))

  schema.form.pages.forEach((page) => {
    pageIds.add(page.id)

    if (page.visibility.mode === 'conditional' && !ruleIds.has(page.visibility.ruleRef)) {
      diagnostics.push({
        code: 'missing-rule-reference',
        severity: 'error',
        message: `Page ${page.id} references missing rule ${page.visibility.ruleRef}`,
        targetId: page.id,
      })
    }

    page.fields.forEach((field) => {
      fieldTypeById[field.id] = field.type
      if (field.visibility.mode === 'conditional' && !ruleIds.has(field.visibility.ruleRef)) {
        diagnostics.push({
          code: 'missing-rule-reference',
          severity: 'error',
          message: `Field ${field.id} references missing rule ${field.visibility.ruleRef}`,
          targetId: field.id,
        })
      }
    })
  })

  schema.form.rules.forEach((rule, index) => {
    const facts = new Set<string>()
    extractFacts(rule.when, facts)

    const leafConditions: Array<{ fact: string; operator: Operator }> = []
    collectLeafConditions(rule.when, leafConditions)

    leafConditions.forEach(({ fact, operator }) => {
      const fieldType = fieldTypeById[fact]
      if (!fieldType) {
        diagnostics.push({
          code: 'unknown-fact',
          severity: 'error',
          ruleId: rule.id,
          targetId: fact,
          message: `Rule ${rule.id} references unknown fact ${fact}`,
        })
        return
      }

      if (!validateOperatorCompatibility(fieldType, operator)) {
        diagnostics.push({
          code: 'operator-type-mismatch',
          severity: 'error',
          ruleId: rule.id,
          targetId: fact,
          message: `Rule ${rule.id} uses operator ${operator} incompatible with field type ${fieldType}`,
        })
      }
    })

    const targets: string[] = []
    const allActions = [...rule.then, ...(rule.else ?? [])]

    allActions.forEach((action) => {
      targets.push(action.target)

      if (FIELD_TARGET_ACTIONS.has(action.action) && !fieldTypeById[action.target]) {
        diagnostics.push({
          code: 'unknown-target',
          severity: 'error',
          ruleId: rule.id,
          targetId: action.target,
          message: `Rule ${rule.id} targets missing field ${action.target}`,
        })
      }

      if (PAGE_TARGET_ACTIONS.has(action.action) && !pageIds.has(action.target)) {
        diagnostics.push({
          code: 'unknown-target',
          severity: 'error',
          ruleId: rule.id,
          targetId: action.target,
          message: `Rule ${rule.id} targets missing page ${action.target}`,
        })
      }
    })

    compiledRulesById[rule.id] = {
      id: rule.id,
      priority: rule.priority ?? 0,
      order: index,
      sourceFacts: [...facts],
      targets,
      raw: rule,
    }

    targetIndex[rule.id] = [...new Set(targets)]

    facts.forEach((fact) => {
      if (!dependencyIndex[fact]) {
        dependencyIndex[fact] = []
      }
      dependencyIndex[fact].push(rule.id)
    })
  })

  Object.keys(dependencyIndex).forEach((factId) => {
    dependencyIndex[factId] = [...new Set(dependencyIndex[factId])]
  })

  const fieldGraph: Record<string, Set<string>> = {}
  Object.keys(fieldTypeById).forEach((fieldId) => {
    fieldGraph[fieldId] = new Set<string>()
  })

  Object.values(compiledRulesById).forEach((compiledRule) => {
    const fieldTargets = [...new Set(compiledRule.raw.then.concat(compiledRule.raw.else ?? []))]
      .filter((action) => FIELD_TARGET_ACTIONS.has(action.action))
      .map((action) => action.target)
      .filter((targetId) => Boolean(fieldTypeById[targetId]))

    compiledRule.sourceFacts.forEach((sourceFact) => {
      if (!fieldGraph[sourceFact]) {
        fieldGraph[sourceFact] = new Set<string>()
      }
      fieldTargets.forEach((target) => fieldGraph[sourceFact].add(target))
    })
  })

  const cycles = findCycles(fieldGraph)
  cycles.forEach((cycle) => {
    diagnostics.push({
      code: 'cycle-detected',
      severity: 'error',
      message: `Cycle detected in rule dependencies: ${cycle.join(' -> ')} -> ${cycle[0]}`,
    })
  })

  const orderedRuleIds = Object.values(compiledRulesById)
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      return a.order - b.order
    })
    .map((rule) => rule.id)

  return {
    dependencyIndex,
    targetIndex,
    orderedRuleIds,
    compiledRulesById,
    diagnostics,
    hasErrors: diagnostics.some((item) => item.severity === 'error'),
  }
}
