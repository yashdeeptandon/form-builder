// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { configureStore } from '@reduxjs/toolkit'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FormBuilderPage } from '@/components/pages/form-builder-page'
import { reorderRules } from '@/domains/builder/builder.slice'
import builderReducer from '@/domains/builder/builder.slice'
import previewReducer from '@/domains/preview/preview.slice'
import runtimeReducer from '@/domains/runtime/runtime.slice'
import uiReducer from '@/domains/ui/ui.slice'

vi.mock('@/domains/api/forms-queries', () => ({
  useFormsListQuery: () => ({
    data: [],
    refetch: vi.fn(),
  }),
  useFormDetailQuery: () => ({
    data: undefined,
    isFetching: false,
  }),
  useCreateFormMutation: () => ({
    isPending: false,
    mutate: vi.fn(),
    error: null,
  }),
  useUpdateFormMutation: () => ({
    isPending: false,
    mutate: vi.fn(),
    error: null,
  }),
}))

afterEach(() => {
  cleanup()
})

function renderPage() {
  const store = configureStore({
    reducer: {
      builder: builderReducer,
      preview: previewReducer,
      runtime: runtimeReducer,
      ui: uiReducer,
    },
  })

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const view = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <FormBuilderPage />
      </QueryClientProvider>
    </Provider>,
  )

  return {
    ...view,
    store,
  }
}

describe('FormBuilderPage integration', () => {
  it('creates and edits a rule that changes preview visibility', async () => {
    renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Add Field' }))
    await user.click(screen.getByRole('button', { name: 'Add Rule' }))

    const conditionInput = await screen.findByTestId('condition-value-0')
    await user.clear(conditionInput)
    await user.type(conditionInput, 'yes')

    const thenActionType = screen.getByTestId('then-action-type-0')
    await user.selectOptions(thenActionType, 'hideField')

    const thenActionTarget = screen.getByTestId('then-action-target-0')
    await user.selectOptions(
      thenActionTarget,
      within(thenActionTarget).getByRole('option', { name: 'Text Field' }),
    )

    await user.click(screen.getByRole('button', { name: 'Preview Mode' }))

    expect(screen.queryByText('Text Field')).not.toBeNull()

    const previewInputs = screen.getAllByRole('textbox')
    await user.type(previewInputs[0], 'yes')

    await waitFor(() => {
      expect(screen.queryByText('Text Field')).toBeNull()
    })
  })

  it('applies reordered rule precedence in preview when priorities match', async () => {
    const { store } = renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Add Field' }))
    await user.click(screen.getByRole('button', { name: 'Add Rule' }))
    await user.click(screen.getByRole('button', { name: 'Add Rule' }))

    const firstRuleId = store.getState().builder.ruleOrder[0]
    const secondRuleId = store.getState().builder.ruleOrder[1]

    await user.click(screen.getByRole('button', { name: firstRuleId }))

    const firstConditionInput = await screen.findByTestId('condition-value-0')
    await user.clear(firstConditionInput)
    await user.type(firstConditionInput, 'yes')

    const firstThenActionType = screen.getByTestId('then-action-type-0')
    await user.selectOptions(firstThenActionType, 'hideField')

    const firstThenActionTarget = screen.getByTestId('then-action-target-0')
    await user.selectOptions(
      firstThenActionTarget,
      within(firstThenActionTarget).getByRole('option', { name: 'Text Field' }),
    )

    await user.click(screen.getByRole('button', { name: secondRuleId }))

    const secondConditionInput = await screen.findByTestId('condition-value-0')
    await user.clear(secondConditionInput)
    await user.type(secondConditionInput, 'yes')

    const secondThenActionType = screen.getByTestId('then-action-type-0')
    await user.selectOptions(secondThenActionType, 'showField')

    const secondThenActionTarget = screen.getByTestId('then-action-target-0')
    await user.selectOptions(
      secondThenActionTarget,
      within(secondThenActionTarget).getByRole('option', { name: 'Text Field' }),
    )

    const priorityInput = screen.getByRole('spinbutton')
    await user.clear(priorityInput)
    await user.type(priorityInput, '0')

    await user.click(screen.getByRole('button', { name: 'Preview Mode' }))

    const previewInputs = screen.getAllByRole('textbox')
    await user.type(previewInputs[0], 'yes')

    await waitFor(() => {
      expect(screen.queryByText('Text Field')).not.toBeNull()
    })

    store.dispatch(reorderRules({ sourceIndex: 1, targetIndex: 0 }))

    await waitFor(() => {
      expect(screen.queryByText('Text Field')).toBeNull()
    })
  })

  it('applies reordered page visibility precedence in preview when priorities match', async () => {
    const { store } = renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Add Page' }))
    await user.click(screen.getByRole('button', { name: 'Add Rule' }))
    await user.click(screen.getByRole('button', { name: 'Add Rule' }))

    const firstRuleId = store.getState().builder.ruleOrder[0]
    const secondRuleId = store.getState().builder.ruleOrder[1]

    await user.click(screen.getByRole('button', { name: firstRuleId }))

    const firstConditionInput = await screen.findByTestId('condition-value-0')
    await user.clear(firstConditionInput)
    await user.type(firstConditionInput, 'yes')

    const firstThenActionType = screen.getByTestId('then-action-type-0')
    await user.selectOptions(firstThenActionType, 'hidePage')

    const firstThenActionTarget = screen.getByTestId('then-action-target-0')
    await user.selectOptions(
      firstThenActionTarget,
      within(firstThenActionTarget).getByRole('option', { name: 'Page 2' }),
    )

    await user.click(screen.getByRole('button', { name: secondRuleId }))

    const secondConditionInput = await screen.findByTestId('condition-value-0')
    await user.clear(secondConditionInput)
    await user.type(secondConditionInput, 'yes')

    const secondThenActionType = screen.getByTestId('then-action-type-0')
    await user.selectOptions(secondThenActionType, 'showPage')

    const secondThenActionTarget = screen.getByTestId('then-action-target-0')
    await user.selectOptions(
      secondThenActionTarget,
      within(secondThenActionTarget).getByRole('option', { name: 'Page 2' }),
    )

    const priorityInput = screen.getByRole('spinbutton')
    await user.clear(priorityInput)
    await user.type(priorityInput, '0')

    await user.click(screen.getByRole('button', { name: 'Preview Mode' }))

    const previewInputs = screen.getAllByRole('textbox')
    await user.type(previewInputs[0], 'yes')

    await waitFor(() => {
      expect(screen.queryByText('1 / 2')).not.toBeNull()
      expect(screen.getByRole('button', { name: 'Next' }).hasAttribute('disabled')).toBe(false)
    })

    store.dispatch(reorderRules({ sourceIndex: 1, targetIndex: 0 }))

    await waitFor(() => {
      expect(screen.queryByText('1 / 1')).not.toBeNull()
      expect(screen.getByRole('button', { name: 'Next' }).hasAttribute('disabled')).toBe(true)
    })
  })

  it('applies mixed then and else branch conflicts according to rule order', async () => {
    const { store } = renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Add Field' }))
    await user.click(screen.getByRole('button', { name: 'Add Rule' }))
    await user.click(screen.getByRole('button', { name: 'Add Rule' }))

    const firstRuleId = store.getState().builder.ruleOrder[0]
    const secondRuleId = store.getState().builder.ruleOrder[1]

    await user.click(screen.getByRole('button', { name: firstRuleId }))

    const firstConditionInput = await screen.findByTestId('condition-value-0')
    await user.clear(firstConditionInput)
    await user.type(firstConditionInput, 'yes')

    const firstThenActionType = screen.getByTestId('then-action-type-0')
    await user.selectOptions(firstThenActionType, 'hideField')

    const firstThenActionTarget = screen.getByTestId('then-action-target-0')
    await user.selectOptions(
      firstThenActionTarget,
      within(firstThenActionTarget).getByRole('option', { name: 'Text Field' }),
    )

    await user.click(screen.getByRole('button', { name: secondRuleId }))

    const secondConditionInput = await screen.findByTestId('condition-value-0')
    await user.clear(secondConditionInput)
    await user.type(secondConditionInput, 'no')

    const secondThenActionType = screen.getByTestId('then-action-type-0')
    await user.selectOptions(secondThenActionType, 'hideField')

    const secondThenActionTarget = screen.getByTestId('then-action-target-0')
    await user.selectOptions(
      secondThenActionTarget,
      within(secondThenActionTarget).getByRole('option', { name: 'Text Field' }),
    )

    await user.click(screen.getByRole('button', { name: 'Add Else Action' }))

    const elseActionType = screen.getAllByRole('combobox')[5]
    await user.selectOptions(elseActionType, 'showField')

    const elseActionTarget = screen.getAllByRole('combobox')[6]
    await user.selectOptions(
      elseActionTarget,
      within(elseActionTarget).getByRole('option', { name: 'Text Field' }),
    )

    const priorityInput = screen.getByRole('spinbutton')
    await user.clear(priorityInput)
    await user.type(priorityInput, '0')

    await user.click(screen.getByRole('button', { name: 'Preview Mode' }))

    const previewInputs = screen.getAllByRole('textbox')
    await user.type(previewInputs[0], 'yes')

    await waitFor(() => {
      expect(screen.queryByText('Text Field')).not.toBeNull()
    })

    store.dispatch(reorderRules({ sourceIndex: 1, targetIndex: 0 }))

    await waitFor(() => {
      expect(screen.queryByText('Text Field')).toBeNull()
    })
  })

  it('exposes all supported field types in add field selector', () => {
    renderPage()

    const fieldTypeSelect = screen.getAllByTestId('add-field-type-page_1')[0]
    const optionValues = within(fieldTypeSelect)
      .getAllByRole('option')
      .map((option) => option.getAttribute('value'))

    expect(optionValues).toEqual([
      'text',
      'textarea',
      'number',
      'email',
      'phone',
      'date',
      'dropdown',
      'multiSelect',
      'radio',
      'checkbox',
      'checkboxGroup',
      'toggle',
    ])
  })
})
