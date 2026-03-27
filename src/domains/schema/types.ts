export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'dropdown'
  | 'multiSelect'
  | 'radio'
  | 'checkbox'
  | 'checkboxGroup'
  | 'toggle'

export type Operator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'greaterThan'
  | 'lessThan'

export type RuleActionType =
  | 'showField'
  | 'hideField'
  | 'showPage'
  | 'hidePage'
  | 'skipToPage'
  | 'setRequired'
  | 'clearValue'

export type Visibility =
  | { mode: 'always' }
  | { mode: 'conditional'; ruleRef: string }

export interface FieldOption {
  label: string
  value: string
}

export interface FieldValidation {
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  step?: number
  minDate?: string
  maxDate?: string
  format?: 'email' | 'phone'
  pattern?: string
  allowedValues?: string[]
  minSelect?: number
  maxSelect?: number
  mustBeTrue?: boolean
  valueType?: 'boolean'
}

export interface FieldBehaviors {
  clearOnHide: boolean
}

export interface FieldSchema {
  id: string
  type: FieldType
  label: string
  required: boolean
  helperText?: string
  placeholder?: string
  defaultValue?: unknown
  options?: FieldOption[]
  validation?: FieldValidation
  visibility: Visibility
  behaviors?: FieldBehaviors
}

export interface PageSchema {
  id: string
  title: string
  order: number
  visibility: Visibility
  fields: FieldSchema[]
}

export interface RuleConditionLeaf {
  fact: string
  operator: Operator
  value?: unknown
}

export type RuleCondition =
  | RuleConditionLeaf
  | { all: RuleCondition[] }
  | { any: RuleCondition[] }

export interface RuleAction {
  action: RuleActionType
  target: string
  value?: unknown
}

export interface RuleSchema {
  id: string
  priority?: number
  when: RuleCondition
  then: RuleAction[]
  else?: RuleAction[]
}

export interface FormSettings {
  saveProgress: boolean
  clearHiddenValuesByDefault: boolean
}

export interface FormMetadata {
  id: string
  name: string
  description?: string
}

export interface FormNavigation {
  startPageId: string
  strategy: 'sequential_with_skip'
}

export interface FormDefinition extends FormMetadata {
  settings: FormSettings
  pages: PageSchema[]
  rules: RuleSchema[]
  navigation: FormNavigation
}

export interface FormSchema {
  schemaVersion: string
  form: FormDefinition
}
