import { useEffect, useMemo, useState } from 'react'

import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { SectionTitle } from '@/components/atoms/section-title'
import { PreviewFieldControl } from '@/components/molecules/preview-field-control'
import { FoundationStatusPanel } from '@/components/organisms/foundation-status-panel'
import { RuleBuilderPanel } from '@/components/organisms/rule-builder-panel'
import { BuilderWorkspaceTemplate } from '@/components/templates/builder-workspace-template'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  addField,
  addPage,
  removeField,
  removePage,
  selectNode,
  setSchema,
} from '@/domains/builder/builder.slice'
import {
  selectBuilderWarnings,
  selectPagesInOrder,
  selectSchema,
} from '@/domains/builder/selectors'
import { compileFormSchema } from '@/domains/engine'
import { setCurrentPage, setResponse, visitPage } from '@/domains/preview/preview.slice'
import { useRuntimeSync } from '@/domains/preview/use-runtime-sync'
import {
  useCreateFormMutation,
  useFormDetailQuery,
  useFormsListQuery,
  useUpdateFormMutation,
} from '@/domains/api/forms-queries'
import type { FieldType } from '@/domains/schema/types'

const FIELD_TYPE_OPTIONS: Array<{ value: FieldType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'multiSelect', label: 'Multi Select' },
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'checkboxGroup', label: 'Checkbox Group' },
  { value: 'toggle', label: 'Toggle' },
]

function formatSavedAt(isoTimestamp: string) {
  const date = new Date(isoTimestamp)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }
  return date.toLocaleString()
}

export function FormBuilderPage() {
  const dispatch = useAppDispatch()
  const mode = useAppSelector((state) => state.ui.mode)
  const pages = useAppSelector(selectPagesInOrder)
  const schema = useAppSelector(selectSchema)
  const selectedNode = useAppSelector((state) => state.builder.selectedNode)
  const warnings = useAppSelector(selectBuilderWarnings)
  const responses = useAppSelector((state) => state.preview.responses)
  const currentPageId = useAppSelector((state) => state.preview.currentPageId)
  const runtime = useAppSelector((state) => state.runtime)
  const [selectedStoredFormId, setSelectedStoredFormId] = useState<string | null>(null)
  const [fieldTypeByPage, setFieldTypeByPage] = useState<Record<string, FieldType>>({})

  const formsListQuery = useFormsListQuery()
  const formDetailQuery = useFormDetailQuery(selectedStoredFormId)
  const createFormMutation = useCreateFormMutation()
  const updateFormMutation = useUpdateFormMutation()

  const compiled = useMemo(() => compileFormSchema(schema), [schema])
  const compilerErrors = compiled.diagnostics.filter((item) => item.severity === 'error')
  useRuntimeSync(schema, compiled)

  useEffect(() => {
    if (!formDetailQuery.data) {
      return
    }
    dispatch(setSchema(formDetailQuery.data.schema))
  }, [dispatch, formDetailQuery.data])

  const selectedPage = useMemo(() => {
    if (selectedNode.kind !== 'page') {
      return pages[0]
    }
    return pages.find((page) => page.id === selectedNode.id) ?? pages[0]
  }, [pages, selectedNode])
  const selectedCanvasPageId = selectedPage?.id ?? null

  const visiblePageSet = useMemo(() => new Set(runtime.visiblePageIds), [runtime.visiblePageIds])
  const visibleFieldSet = useMemo(
    () => new Set(runtime.visibleFieldIds),
    [runtime.visibleFieldIds],
  )

  const previewPages = useMemo(
    () => pages.filter((page) => visiblePageSet.has(page.id)),
    [pages, visiblePageSet],
  )

  const activePreviewPage = useMemo(() => {
    if (previewPages.length === 0) {
      return null
    }

    if (!currentPageId) {
      return previewPages[0]
    }

    return previewPages.find((page) => page.id === currentPageId) ?? previewPages[0]
  }, [currentPageId, previewPages])

  useEffect(() => {
    if (activePreviewPage?.id) {
      dispatch(visitPage(activePreviewPage.id))
    }
  }, [activePreviewPage, dispatch])

  const activePreviewFields = useMemo(() => {
    if (!activePreviewPage) {
      return []
    }
    return activePreviewPage.fields.filter((field) => visibleFieldSet.has(field.id))
  }, [activePreviewPage, visibleFieldSet])

  const currentPreviewIndex = useMemo(() => {
    if (!activePreviewPage) {
      return -1
    }
    return previewPages.findIndex((page) => page.id === activePreviewPage.id)
  }, [activePreviewPage, previewPages])

  const canGoBack = currentPreviewIndex > 0
  const canGoNext = currentPreviewIndex >= 0 && currentPreviewIndex < previewPages.length - 1

  const isSaving = createFormMutation.isPending || updateFormMutation.isPending
  const existingSummary = (formsListQuery.data ?? []).find(
    (item) => item.id === schema.form.id,
  )

  const saveCurrentSchema = () => {
    if (existingSummary) {
      updateFormMutation.mutate({ id: schema.form.id, schema })
      return
    }

    createFormMutation.mutate({ schema })
  }

  const goToPreviewPage = (delta: -1 | 1) => {
    if (currentPreviewIndex < 0) {
      return
    }

    const nextIndex = currentPreviewIndex + delta
    const nextPage = previewPages[nextIndex]
    if (nextPage) {
      dispatch(setCurrentPage(nextPage.id))
    }
  }

  const getSelectedFieldType = (pageId: string): FieldType => fieldTypeByPage[pageId] ?? 'text'

  const addFieldToPage = (pageId: string) => {
    const selectedType = getSelectedFieldType(pageId)
    const selectedMeta = FIELD_TYPE_OPTIONS.find((item) => item.value === selectedType)
    dispatch(
      addField({
        pageId,
        type: selectedType,
        label: selectedMeta ? `${selectedMeta.label} Field` : undefined,
      }),
    )
  }

  return (
    <div className='min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-7xl space-y-6'>
        <SectionTitle
          title='Form Builder with Conditional Branching'
          subtitle='Phase 2 state normalization and CRUD are active. Rule compiler diagnostics are now wired in inspector.'
        />

        <FoundationStatusPanel />

        <BuilderWorkspaceTemplate
          left={
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-semibold'>Pages</h3>
                <Badge variant='outline'>{pages.length}</Badge>
                <Button
                  size='sm'
                  onClick={() =>
                    dispatch(
                      addPage({
                        title: `Page ${pages.length + 1}`,
                      }),
                    )
                  }
                >
                  Add Page
                </Button>
              </div>
              {pages.length > 0 ? (
                <div className='rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Page</TableHead>
                        <TableHead>Fields</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pages.map((page) => (
                        <TableRow
                          key={page.id}
                          data-state={selectedCanvasPageId === page.id ? 'selected' : undefined}
                        >
                          <TableCell className='font-medium'>
                            <button
                              type='button'
                              className='text-left hover:underline'
                              onClick={() => dispatch(selectNode({ kind: 'page', id: page.id }))}
                            >
                              {page.title}
                            </button>
                          </TableCell>
                          <TableCell>{page.fields.length}</TableCell>
                          <TableCell className='text-right'>
                            <div className='flex justify-end gap-1'>
                              <select
                                data-testid={`add-field-type-${page.id}`}
                                className='h-6 rounded-md border bg-background px-2 text-xs'
                                value={getSelectedFieldType(page.id)}
                                onChange={(event) =>
                                  setFieldTypeByPage((current) => ({
                                    ...current,
                                    [page.id]: event.target.value as FieldType,
                                  }))
                                }
                              >
                                {FIELD_TYPE_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <Button
                                size='xs'
                                variant='outline'
                                onClick={() => addFieldToPage(page.id)}
                              >
                                Add Field
                              </Button>
                              <Button
                                size='xs'
                                variant='ghost'
                                onClick={() => dispatch(removePage({ pageId: page.id }))}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className='text-xs text-muted-foreground'>No pages yet. Add your first page.</p>
              )}
            </div>
          }
          center={
            <div className='space-y-2'>
              <h3 className='text-sm font-semibold'>Canvas</h3>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <span>Active mode:</span>
                <Badge variant={mode === 'builder' ? 'default' : 'secondary'}>{mode}</Badge>
              </div>
              {mode === 'builder' && selectedPage ? (
                <div className='space-y-2'>
                  <p className='text-sm font-medium'>{selectedPage.title}</p>
                  {selectedPage.fields.map((field) => (
                    <div
                      key={field.id}
                      className='flex items-center justify-between rounded-md border px-3 py-2 text-sm'
                    >
                      <div>
                        <p className='font-medium'>{field.label}</p>
                        <p className='text-xs text-muted-foreground'>
                          {field.type} • {field.id}
                        </p>
                      </div>
                      <Button
                        size='xs'
                        variant='ghost'
                        onClick={() =>
                          dispatch(
                            removeField({
                              pageId: selectedPage.id,
                              fieldId: field.id,
                            }),
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}

              {mode === 'preview' ? (
                <div className='space-y-4'>
                  {activePreviewPage ? (
                    <>
                      <div className='rounded-md border bg-background p-3'>
                        <p className='text-xs uppercase tracking-wide text-muted-foreground'>
                          Preview Page
                        </p>
                        <p className='text-sm font-medium'>{activePreviewPage.title}</p>
                      </div>

                      <div className='space-y-3'>
                        {activePreviewFields.map((field) => (
                          <PreviewFieldControl
                            key={field.id}
                            field={field}
                            required={runtime.requiredOverrides[field.id] ?? field.required}
                            value={responses[field.id]}
                            onChange={(fieldId, value) =>
                              dispatch(
                                setResponse({
                                  fieldId,
                                  value,
                                }),
                              )
                            }
                          />
                        ))}
                      </div>

                      <div className='flex items-center justify-between pt-2'>
                        <Button variant='outline' onClick={() => goToPreviewPage(-1)} disabled={!canGoBack}>
                          Back
                        </Button>
                        <span className='text-xs text-muted-foreground'>
                          {currentPreviewIndex + 1} / {previewPages.length}
                        </span>
                        <Button onClick={() => goToPreviewPage(1)} disabled={!canGoNext}>
                          Next
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className='text-sm text-muted-foreground'>
                      No visible preview pages. Add rules or switch to builder mode.
                    </p>
                  )}
                </div>
              ) : null}

              {mode === 'builder' && !selectedPage ? (
                <p className='text-sm text-muted-foreground'>No page selected.</p>
              ) : null}
            </div>
          }
          right={
            <div className='space-y-2'>
              <h3 className='text-sm font-semibold'>Inspector</h3>
              {mode === 'builder' ? <RuleBuilderPanel /> : null}

              {compilerErrors.length === 0 ? (
                <div className='rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-700'>
                  <div className='mb-1'>
                    <Badge variant='secondary' className='border-emerald-600/20 bg-emerald-600/10 text-emerald-700'>
                      Compiler Clean
                    </Badge>
                  </div>
                  Compiler status is clean. No rule compilation errors detected.
                </div>
              ) : (
                <div className='space-y-2'>
                  {compilerErrors.map((diagnostic, index) => (
                    <div
                      key={`${diagnostic.code}-${index}`}
                      className='rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs'
                    >
                      <p className='font-medium text-amber-700'>{diagnostic.message}</p>
                      {diagnostic.ruleId ? (
                        <p className='text-amber-700/90'>Rule: {diagnostic.ruleId}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {warnings.length === 0 ? (
                <p className='text-xs text-muted-foreground'>
                  No dependency warnings from builder delete guards.
                </p>
              ) : (
                <div className='space-y-2'>
                  {warnings.map((warning) => (
                    <div
                      key={warning.id}
                      className='rounded-md border border-orange-500/30 bg-orange-500/10 p-2 text-xs'
                    >
                      <p className='font-medium text-orange-700'>{warning.message}</p>
                      <p className='text-orange-700/90'>References: {warning.references.join(', ')}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className='space-y-2 rounded-md border p-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                      Persistence
                    </p>
                    <Badge variant='outline'>{(formsListQuery.data ?? []).length} saved</Badge>
                  </div>
                  <Button size='xs' variant='outline' onClick={() => formsListQuery.refetch()}>
                    Refresh
                  </Button>
                </div>

                <Button size='sm' onClick={saveCurrentSchema} disabled={isSaving}>
                  {isSaving
                    ? 'Saving...'
                    : existingSummary
                      ? 'Update Form'
                      : 'Create Form'}
                </Button>

                {createFormMutation.error ? (
                  <p className='text-xs text-destructive'>{createFormMutation.error.message}</p>
                ) : null}
                {updateFormMutation.error ? (
                  <p className='text-xs text-destructive'>{updateFormMutation.error.message}</p>
                ) : null}

                {(formsListQuery.data ?? []).length > 0 ? (
                  <div className='rounded-md border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Version</TableHead>
                          <TableHead>Saved</TableHead>
                          <TableHead className='text-right'>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(formsListQuery.data ?? []).map((summary) => (
                          <TableRow key={summary.id}>
                            <TableCell className='font-medium'>{summary.name}</TableCell>
                            <TableCell>v{summary.version}</TableCell>
                            <TableCell>{formatSavedAt(summary.savedAt)}</TableCell>
                            <TableCell className='text-right'>
                              <Button
                                size='xs'
                                variant='ghost'
                                onClick={() => setSelectedStoredFormId(summary.id)}
                                disabled={
                                  formDetailQuery.isFetching && selectedStoredFormId === summary.id
                                }
                              >
                                {formDetailQuery.isFetching && selectedStoredFormId === summary.id
                                  ? 'Loading'
                                  : 'Load'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className='text-xs text-muted-foreground'>
                    No stored forms yet. Create one to test the mock API.
                  </p>
                )}
              </div>
            </div>
          }
        />
      </div>
    </div>
  )
}
