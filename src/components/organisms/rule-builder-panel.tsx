import type { CSSProperties, ReactNode } from 'react'
import { nanoid } from 'nanoid'
import { useEffect, useMemo, useState } from 'react'
import {
  closestCenter,
  DndContext,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  reorderRules,
  removeRule,
  selectNode,
  upsertRule,
} from '@/domains/builder/builder.slice'
import {
  selectAllFields,
  selectPagesInOrder,
  selectRules,
} from '@/domains/builder/selectors'
import type {
  FieldSchema,
  FieldType,
  Operator,
  RuleAction,
  RuleActionType,
  RuleCondition,
  RuleConditionLeaf,
  RuleSchema,
} from '@/domains/schema/types'

const OPERATOR_BY_FIELD_TYPE: Record<FieldType, Operator[]> = {
  text: ['equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty'],
  textarea: ['equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty'],
  number: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty', 'greaterThan', 'lessThan'],
  email: ['equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty'],
  phone: ['equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty'],
  date: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty', 'greaterThan', 'lessThan'],
  dropdown: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
  multiSelect: ['contains', 'notContains', 'isEmpty', 'isNotEmpty'],
  radio: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
  checkbox: ['equals', 'notEquals'],
  checkboxGroup: ['contains', 'notContains', 'isEmpty', 'isNotEmpty'],
  toggle: ['equals', 'notEquals'],
}

const ACTION_TARGET_KIND: Record<RuleActionType, 'field' | 'page'> = {
  showField: 'field',
  hideField: 'field',
  setRequired: 'field',
  clearValue: 'field',
  showPage: 'page',
  hidePage: 'page',
  skipToPage: 'page',
}

const OPERATOR_LABELS: Record<Operator, string> = {
  equals: 'Equals',
  notEquals: 'Not Equals',
  contains: 'Contains',
  notContains: 'Not Contains',
  isEmpty: 'Is Empty',
  isNotEmpty: 'Is Not Empty',
  greaterThan: 'Greater Than',
  lessThan: 'Less Than',
}

const ACTION_LABELS: Record<RuleActionType, string> = {
  showField: 'Show Field',
  hideField: 'Hide Field',
  setRequired: 'Set Required',
  clearValue: 'Clear Value',
  showPage: 'Show Page',
  hidePage: 'Hide Page',
  skipToPage: 'Skip To Page',
}

const INPUT_CLASS =
  'h-7 w-full rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50'

const ALL_ACTIONS: RuleActionType[] = [
  'showField',
  'hideField',
  'setRequired',
  'clearValue',
  'showPage',
  'hidePage',
  'skipToPage',
]

interface SortableRuleRowProps {
  id: string
  selected: boolean
  children: ReactNode
}

function SortableRuleRow({ id, selected, children }: SortableRuleRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      data-state={selected ? 'selected' : undefined}
      className={isDragging ? 'opacity-70' : undefined}
    >
      <TableCell className='w-8'>
        <button
          type='button'
          aria-label='Drag rule'
          className='cursor-grab text-xs text-muted-foreground active:cursor-grabbing'
          {...attributes}
          {...listeners}
        >
          ::
        </button>
      </TableCell>
      {children}
    </TableRow>
  )
}

interface SortableConditionCardProps {
  id: string
  children: ReactNode
}

function SortableConditionCard({ id, children }: SortableConditionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`space-y-1 rounded-md border p-2 ${isDragging ? 'opacity-70' : ''}`}
    >
      <div className='mb-1 flex justify-end'>
        <button
          type='button'
          aria-label='Drag condition'
          className='cursor-grab text-xs text-muted-foreground active:cursor-grabbing'
          {...attributes}
          {...listeners}
        >
          ::
        </button>
      </div>
      {children}
    </div>
  )
}

function cloneCondition(condition: RuleCondition): RuleCondition {
  if ('fact' in condition) {
    return {
      fact: condition.fact,
      operator: condition.operator,
      value: condition.value,
    }
  }

  if ('all' in condition) {
    return { all: condition.all.map((item) => cloneCondition(item)) }
  }

  return { any: condition.any.map((item) => cloneCondition(item)) }
}

function cloneRule(rule: RuleSchema): RuleSchema {
  return {
    ...rule,
    when: cloneCondition(rule.when),
    then: rule.then.map((action) => ({ ...action })),
    else: rule.else?.map((action) => ({ ...action })),
  }
}

function collectLeaves(condition: RuleCondition, out: RuleConditionLeaf[]) {
  if ('fact' in condition) {
    out.push({ fact: condition.fact, operator: condition.operator, value: condition.value })
    return
  }

  if ('all' in condition) {
    condition.all.forEach((item) => collectLeaves(item, out))
    return
  }

  condition.any.forEach((item) => collectLeaves(item, out))
}

function isFlatCondition(condition: RuleCondition): boolean {
  if ('fact' in condition) {
    return true
  }

  const items = 'all' in condition ? condition.all : condition.any
  return items.every((item) => 'fact' in item)
}

function operatorNeedsValue(operator: Operator): boolean {
  return operator !== 'isEmpty' && operator !== 'isNotEmpty'
}

function getConditionGate(condition: RuleCondition): 'all' | 'any' {
  if ('any' in condition) {
    return 'any'
  }
  return 'all'
}

function defaultLeaf(factId: string): RuleConditionLeaf {
  return {
    fact: factId,
    operator: 'equals',
    value: '',
  }
}

function rootCondition(gate: 'all' | 'any', leaves: RuleConditionLeaf[]): RuleCondition {
  if (gate === 'all') {
    return { all: leaves }
  }

  return { any: leaves }
}

function toNumberOrString(value: string): number | string {
  if (value.trim() === '') {
    return ''
  }
  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    return value
  }
  return parsed
}

function getAllowedOperators(field: FieldSchema | undefined): Operator[] {
  if (!field) {
    return OPERATOR_BY_FIELD_TYPE.text
  }

  return OPERATOR_BY_FIELD_TYPE[field.type]
}

function defaultActionTarget(
  actionType: RuleActionType,
  fieldIds: string[],
  pageIds: string[],
): string {
  if (ACTION_TARGET_KIND[actionType] === 'field') {
    return fieldIds[0] ?? ''
  }
  return pageIds[0] ?? ''
}

function defaultRule(fieldIds: string[], pageIds: string[], index: number): RuleSchema {
  const id = `rule_${nanoid(6)}`
  const defaultFact = fieldIds[0] ?? ''

  return {
    id,
    priority: index,
    when: {
      all: [defaultLeaf(defaultFact)],
    },
    then: [
      {
        action: fieldIds.length > 0 ? 'showField' : 'showPage',
        target: fieldIds.length > 0 ? fieldIds[0] : pageIds[0] ?? '',
      },
    ],
    else: [],
  }
}

function toEditableLeaves(condition: RuleCondition): RuleConditionLeaf[] {
  if ('fact' in condition) {
    return [
      {
        fact: condition.fact,
        operator: condition.operator,
        value: condition.value,
      },
    ]
  }

  const leaves: RuleConditionLeaf[] = []
  collectLeaves(condition, leaves)
  return leaves
}

export function RuleBuilderPanel() {
  const dispatch = useAppDispatch()
  const rules = useAppSelector(selectRules)
  const fields = useAppSelector(selectAllFields)
  const pages = useAppSelector(selectPagesInOrder)
  const selectedNode = useAppSelector((state) => state.builder.selectedNode)
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  )

  const fieldById = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.id, field])),
    [fields],
  )

  const fieldIds = useMemo(() => fields.map((field) => field.id), [fields])
  const pageIds = useMemo(() => pages.map((page) => page.id), [pages])

  useEffect(() => {
    if (selectedNode.kind !== 'rule') {
      return
    }
    setActiveRuleId(selectedNode.id)
  }, [selectedNode])

  useEffect(() => {
    if (rules.length === 0) {
      setActiveRuleId(null)
      return
    }

    if (!activeRuleId || !rules.some((rule) => rule.id === activeRuleId)) {
      setActiveRuleId(rules[0].id)
    }
  }, [activeRuleId, rules])

  const activeRule = useMemo(
    () => rules.find((rule) => rule.id === activeRuleId) ?? null,
    [activeRuleId, rules],
  )

  const updateRule = (ruleId: string, update: (rule: RuleSchema) => void) => {
    const current = rules.find((rule) => rule.id === ruleId)
    if (!current) {
      return
    }

    const next = cloneRule(current)
    update(next)
    dispatch(upsertRule(next))
  }

  const selectRuleById = (ruleId: string) => {
    setActiveRuleId(ruleId)
    dispatch(selectNode({ kind: 'rule', id: ruleId }))
  }

  const createRule = () => {
    const rule = defaultRule(fieldIds, pageIds, rules.length)
    dispatch(upsertRule(rule))
    selectRuleById(rule.id)
  }

  const onRuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    const from = rules.findIndex((rule) => rule.id === String(active.id))
    const to = rules.findIndex((rule) => rule.id === String(over.id))
    if (from < 0 || to < 0) {
      return
    }

    dispatch(reorderRules({ sourceIndex: from, targetIndex: to }))
  }

  const onConditionDragEnd = (event: DragEndEvent) => {
    if (!activeRule) {
      return
    }

    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    const from = Number(String(active.id).replace('condition-', ''))
    const to = Number(String(over.id).replace('condition-', ''))
    if (Number.isNaN(from) || Number.isNaN(to) || from < 0 || to < 0) {
      return
    }

    updateRule(activeRule.id, (rule) => {
      const gate = getConditionGate(rule.when)
      const leaves = toEditableLeaves(rule.when)
      if (from >= leaves.length || to >= leaves.length) {
        return
      }

      rule.when = rootCondition(gate, arrayMove(leaves, from, to))
    })
  }

  const deleteRuleById = (ruleId: string) => {
    dispatch(removeRule(ruleId))
    if (activeRuleId === ruleId) {
      setActiveRuleId(null)
      dispatch(selectNode({ kind: 'none', id: null }))
    }
  }

  const updateConditionGate = (gate: 'all' | 'any') => {
    if (!activeRule) {
      return
    }
    updateRule(activeRule.id, (rule) => {
      const leaves = toEditableLeaves(rule.when)
      rule.when = rootCondition(gate, leaves)
    })
  }

  const addConditionLeaf = () => {
    if (!activeRule) {
      return
    }

    const fallbackFact = fieldIds[0] ?? ''
    updateRule(activeRule.id, (rule) => {
      const gate = getConditionGate(rule.when)
      const leaves = toEditableLeaves(rule.when)
      leaves.push(defaultLeaf(fallbackFact))
      rule.when = rootCondition(gate, leaves)
    })
  }

  const updateConditionLeaf = (
    leafIndex: number,
    update: (leaf: RuleConditionLeaf) => void,
  ) => {
    if (!activeRule) {
      return
    }

    updateRule(activeRule.id, (rule) => {
      const gate = getConditionGate(rule.when)
      const leaves = toEditableLeaves(rule.when)
      const currentLeaf = leaves[leafIndex]
      if (!currentLeaf) {
        return
      }

      const nextLeaf = { ...currentLeaf }
      update(nextLeaf)
      leaves[leafIndex] = nextLeaf
      rule.when = rootCondition(gate, leaves)
    })
  }

  const removeConditionLeaf = (leafIndex: number) => {
    if (!activeRule) {
      return
    }

    updateRule(activeRule.id, (rule) => {
      const gate = getConditionGate(rule.when)
      const leaves = toEditableLeaves(rule.when)
      if (leaves.length <= 1) {
        return
      }

      leaves.splice(leafIndex, 1)
      rule.when = rootCondition(gate, leaves)
    })
  }

  const updateAction = (
    branch: 'then' | 'else',
    actionIndex: number,
    update: (action: RuleAction) => void,
  ) => {
    if (!activeRule) {
      return
    }

    updateRule(activeRule.id, (rule) => {
      const bucket = branch === 'then' ? rule.then : (rule.else ??= [])
      const currentAction = bucket[actionIndex]
      if (!currentAction) {
        return
      }

      const nextAction = { ...currentAction }
      update(nextAction)
      bucket[actionIndex] = nextAction
    })
  }

  const addAction = (branch: 'then' | 'else') => {
    if (!activeRule) {
      return
    }

    updateRule(activeRule.id, (rule) => {
      const nextActionType: RuleActionType = fieldIds.length > 0 ? 'showField' : 'showPage'
      const nextAction: RuleAction = {
        action: nextActionType,
        target: defaultActionTarget(nextActionType, fieldIds, pageIds),
      }

      if (branch === 'then') {
        rule.then.push(nextAction)
      } else {
        const elseActions = rule.else ?? []
        elseActions.push(nextAction)
        rule.else = elseActions
      }
    })
  }

  const removeAction = (branch: 'then' | 'else', actionIndex: number) => {
    if (!activeRule) {
      return
    }

    updateRule(activeRule.id, (rule) => {
      const bucket = branch === 'then' ? rule.then : (rule.else ??= [])
      if (!bucket[actionIndex]) {
        return
      }

      bucket.splice(actionIndex, 1)
    })
  }

  const conditionLeaves = useMemo(
    () => (activeRule ? toEditableLeaves(activeRule.when) : []),
    [activeRule],
  )

  const conditionGate = useMemo(
    () => (activeRule ? getConditionGate(activeRule.when) : 'all'),
    [activeRule],
  )

  return (
    <Card size='sm' className='gap-0 py-0'>
      <CardHeader className='border-b'>
        <CardTitle className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          Rule Builder
        </CardTitle>
        <CardDescription className='text-xs'>
          Author conditional branching rules for fields and pages.
        </CardDescription>
        <CardAction className='flex items-center gap-2'>
          <Badge variant='outline'>{rules.length}</Badge>
          <Button size='xs' onClick={createRule} disabled={fieldIds.length === 0}>
            Add Rule
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className='space-y-3 p-2'>
        {fieldIds.length === 0 ? (
          <p className='text-xs text-muted-foreground'>
            Add at least one field before creating branching rules.
          </p>
        ) : null}

        {rules.length > 0 ? (
          <div className='rounded-md border'>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onRuleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-8' />
                    <TableHead>Rule</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className='text-right'>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody data-testid='rule-list'>
                  <SortableContext
                    items={rules.map((rule) => rule.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {rules.map((rule) => (
                      <SortableRuleRow
                        key={rule.id}
                        id={rule.id}
                        selected={activeRuleId === rule.id}
                      >
                        <TableCell className='font-medium'>
                          <button
                            type='button'
                            className='text-left hover:underline'
                            onClick={() => selectRuleById(rule.id)}
                          >
                            {rule.id}
                          </button>
                        </TableCell>
                        <TableCell>{rule.priority ?? 0}</TableCell>
                        <TableCell className='text-right'>
                          <Button size='xs' variant='ghost' onClick={() => deleteRuleById(rule.id)}>
                            Delete
                          </Button>
                        </TableCell>
                      </SortableRuleRow>
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          </div>
        ) : (
          <p className='text-xs text-muted-foreground'>No rules yet.</p>
        )}

        {activeRule ? (
          <div className='space-y-3 rounded-md border bg-background p-2'>
            <div className='grid grid-cols-[1fr_auto] gap-2'>
              <label className='space-y-1'>
                <span className='text-[11px] font-medium text-muted-foreground'>Rule Id</span>
                <div className={`${INPUT_CLASS} flex items-center`}>{activeRule.id}</div>
              </label>

              <label className='space-y-1'>
                <span className='text-[11px] font-medium text-muted-foreground'>Priority</span>
                <input
                  type='number'
                  className={INPUT_CLASS}
                  value={activeRule.priority ?? 0}
                  onChange={(event) => {
                    const numeric = Number(event.target.value)
                    updateRule(activeRule.id, (rule) => {
                      rule.priority = Number.isNaN(numeric) ? 0 : numeric
                    })
                  }}
                />
              </label>
            </div>

            {!isFlatCondition(activeRule.when) ? (
              <div className='rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-700'>
                This rule currently has nested condition groups. Editing in this panel will flatten
                it into a single group.
              </div>
            ) : null}

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <p className='text-[11px] font-medium text-muted-foreground'>When</p>
                <div className='flex gap-1'>
                  <Button
                    size='xs'
                    variant={conditionGate === 'all' ? 'default' : 'outline'}
                    onClick={() => updateConditionGate('all')}
                  >
                    ALL
                  </Button>
                  <Button
                    size='xs'
                    variant={conditionGate === 'any' ? 'default' : 'outline'}
                    onClick={() => updateConditionGate('any')}
                  >
                    ANY
                  </Button>
                </div>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onConditionDragEnd}
              >
                <SortableContext
                  items={conditionLeaves.map((_, index) => `condition-${index}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {conditionLeaves.map((leaf, leafIndex) => {
                    const factField = fieldById[leaf.fact]
                    const allowedOperators = getAllowedOperators(factField)
                    const showValueInput = operatorNeedsValue(leaf.operator)

                    return (
                      <SortableConditionCard
                        key={`condition-${leafIndex}`}
                        id={`condition-${leafIndex}`}
                      >
                        <div className='grid grid-cols-3 gap-1'>
                          <select
                            className={INPUT_CLASS}
                            value={leaf.fact}
                            onChange={(event) => {
                              const factId = event.target.value
                              const nextField = fieldById[factId]
                              const nextAllowed = getAllowedOperators(nextField)
                              updateConditionLeaf(leafIndex, (nextLeaf) => {
                                nextLeaf.fact = factId
                                if (!nextAllowed.includes(nextLeaf.operator)) {
                                  nextLeaf.operator = nextAllowed[0]
                                }
                              })
                            }}
                          >
                            {fields.map((field) => (
                              <option key={field.id} value={field.id}>
                                {field.label}
                              </option>
                            ))}
                          </select>

                          <select
                            className={INPUT_CLASS}
                            value={leaf.operator}
                            onChange={(event) => {
                              const nextOperator = event.target.value as Operator
                              updateConditionLeaf(leafIndex, (nextLeaf) => {
                                nextLeaf.operator = nextOperator
                                if (!operatorNeedsValue(nextOperator)) {
                                  delete nextLeaf.value
                                } else if (nextLeaf.value === undefined) {
                                  nextLeaf.value = ''
                                }
                              })
                            }}
                          >
                            {allowedOperators.map((operator) => (
                              <option key={operator} value={operator}>
                                {OPERATOR_LABELS[operator]}
                              </option>
                            ))}
                          </select>

                          <Button
                            size='xs'
                            variant='ghost'
                            onClick={() => removeConditionLeaf(leafIndex)}
                            disabled={conditionLeaves.length <= 1}
                          >
                            Remove
                          </Button>
                        </div>

                        {showValueInput ? (
                          <>
                            {factField?.type === 'checkbox' || factField?.type === 'toggle' ? (
                              <select
                                className={INPUT_CLASS}
                                value={String(Boolean(leaf.value))}
                                onChange={(event) =>
                                  updateConditionLeaf(leafIndex, (nextLeaf) => {
                                    nextLeaf.value = event.target.value === 'true'
                                  })
                                }
                              >
                                <option value='true'>True</option>
                                <option value='false'>False</option>
                              </select>
                            ) : (
                              <input
                                data-testid={`condition-value-${leafIndex}`}
                                className={INPUT_CLASS}
                                type={factField?.type === 'number' ? 'number' : 'text'}
                                value={String(leaf.value ?? '')}
                                onChange={(event) =>
                                  updateConditionLeaf(leafIndex, (nextLeaf) => {
                                    nextLeaf.value =
                                      factField?.type === 'number'
                                        ? toNumberOrString(event.target.value)
                                        : event.target.value
                                  })
                                }
                              />
                            )}
                          </>
                        ) : null}
                      </SortableConditionCard>
                    )
                  })}
                </SortableContext>
              </DndContext>

              <Button size='xs' variant='outline' onClick={addConditionLeaf}>
                Add Condition
              </Button>
            </div>

          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <p className='text-[11px] font-medium text-muted-foreground'>Then Actions</p>
              <Badge variant='outline'>{activeRule.then.length}</Badge>
            </div>
            {activeRule.then.map((action, actionIndex) => {
              const targetKind = ACTION_TARGET_KIND[action.action]
              const targetOptions = targetKind === 'field' ? fields : pages

              return (
                <div key={`then-${actionIndex}`} className='space-y-1 rounded-md border p-2'>
                  <div className='grid grid-cols-[1fr_1fr_auto] gap-1'>
                    <select
                      data-testid={`then-action-type-${actionIndex}`}
                      className={INPUT_CLASS}
                      value={action.action}
                      onChange={(event) => {
                        const nextAction = event.target.value as RuleActionType
                        updateAction('then', actionIndex, (next) => {
                          next.action = nextAction
                          next.target = defaultActionTarget(nextAction, fieldIds, pageIds)
                          if (nextAction === 'setRequired') {
                            next.value = true
                          } else {
                            delete next.value
                          }
                        })
                      }}
                    >
                      {ALL_ACTIONS.map((actionType) => (
                        <option key={actionType} value={actionType}>
                          {ACTION_LABELS[actionType]}
                        </option>
                      ))}
                    </select>

                    <select
                      data-testid={`then-action-target-${actionIndex}`}
                      className={INPUT_CLASS}
                      value={action.target}
                      onChange={(event) => {
                        updateAction('then', actionIndex, (next) => {
                          next.target = event.target.value
                        })
                      }}
                    >
                      {targetOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {'label' in option ? option.label : option.title}
                        </option>
                      ))}
                    </select>

                    <Button
                      size='xs'
                      variant='ghost'
                      onClick={() => removeAction('then', actionIndex)}
                    >
                      Remove
                    </Button>
                  </div>

                  {action.action === 'setRequired' ? (
                    <select
                      className={INPUT_CLASS}
                      value={String(action.value ?? true)}
                      onChange={(event) =>
                        updateAction('then', actionIndex, (next) => {
                          next.value = event.target.value === 'true'
                        })
                      }
                    >
                      <option value='true'>Set required</option>
                      <option value='false'>Set optional</option>
                    </select>
                  ) : null}
                </div>
              )
            })}
            <Button size='xs' variant='outline' onClick={() => addAction('then')}>
              Add Then Action
            </Button>
          </div>

          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <p className='text-[11px] font-medium text-muted-foreground'>Else Actions</p>
              <Badge variant='outline'>{(activeRule.else ?? []).length}</Badge>
            </div>
            {(activeRule.else ?? []).map((action, actionIndex) => {
              const targetKind = ACTION_TARGET_KIND[action.action]
              const targetOptions = targetKind === 'field' ? fields : pages

              return (
                <div key={`else-${actionIndex}`} className='space-y-1 rounded-md border p-2'>
                  <div className='grid grid-cols-[1fr_1fr_auto] gap-1'>
                    <select
                      className={INPUT_CLASS}
                      value={action.action}
                      onChange={(event) => {
                        const nextAction = event.target.value as RuleActionType
                        updateAction('else', actionIndex, (next) => {
                          next.action = nextAction
                          next.target = defaultActionTarget(nextAction, fieldIds, pageIds)
                          if (nextAction === 'setRequired') {
                            next.value = true
                          } else {
                            delete next.value
                          }
                        })
                      }}
                    >
                      {ALL_ACTIONS.map((actionType) => (
                        <option key={actionType} value={actionType}>
                          {ACTION_LABELS[actionType]}
                        </option>
                      ))}
                    </select>

                    <select
                      className={INPUT_CLASS}
                      value={action.target}
                      onChange={(event) => {
                        updateAction('else', actionIndex, (next) => {
                          next.target = event.target.value
                        })
                      }}
                    >
                      {targetOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {'label' in option ? option.label : option.title}
                        </option>
                      ))}
                    </select>

                    <Button
                      size='xs'
                      variant='ghost'
                      onClick={() => removeAction('else', actionIndex)}
                    >
                      Remove
                    </Button>
                  </div>

                  {action.action === 'setRequired' ? (
                    <select
                      className={INPUT_CLASS}
                      value={String(action.value ?? true)}
                      onChange={(event) =>
                        updateAction('else', actionIndex, (next) => {
                          next.value = event.target.value === 'true'
                        })
                      }
                    >
                      <option value='true'>Set required</option>
                      <option value='false'>Set optional</option>
                    </select>
                  ) : null}
                </div>
              )
            })}
            <Button size='xs' variant='outline' onClick={() => addAction('else')}>
              Add Else Action
            </Button>
          </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
