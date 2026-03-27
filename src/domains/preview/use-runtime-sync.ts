import { useEffect, useMemo } from 'react'

import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { applyRuntimePatch } from '@/domains/runtime/runtime.slice'
import { evaluateCompiledSchema, type CompiledSchema } from '@/domains/engine'
import { setCurrentPage, setResponses } from '@/domains/preview/preview.slice'
import type { FormSchema } from '@/domains/schema/types'

function areArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  return a.every((item, index) => item === b[index])
}

function areBooleanRecordEqual(
  a: Record<string, boolean>,
  b: Record<string, boolean>,
): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) {
    return false
  }

  return aKeys.every((key) => a[key] === b[key])
}

function areStringRecordEqual(
  a: Record<string, string>,
  b: Record<string, string>,
): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) {
    return false
  }

  return aKeys.every((key) => a[key] === b[key])
}

function areUnknownRecordEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) {
    return false
  }

  return aKeys.every((key) => Object.is(a[key], b[key]))
}

export function useRuntimeSync(schema: FormSchema, compiled: CompiledSchema) {
  const dispatch = useAppDispatch()
  const responses = useAppSelector((state) => state.preview.responses)
  const currentPageId = useAppSelector((state) => state.preview.currentPageId)
  const runtime = useAppSelector((state) => state.runtime)

  const evaluation = useMemo(
    () => evaluateCompiledSchema(schema, compiled, responses, currentPageId),
    [schema, compiled, responses, currentPageId],
  )

  useEffect(() => {
    const patchChanged =
      !areArraysEqual(runtime.visibleFieldIds, evaluation.runtimePatch.visibleFieldIds) ||
      !areArraysEqual(runtime.visiblePageIds, evaluation.runtimePatch.visiblePageIds) ||
      !areBooleanRecordEqual(runtime.requiredOverrides, evaluation.runtimePatch.requiredOverrides) ||
      !areStringRecordEqual(runtime.hiddenReasonByTarget, evaluation.runtimePatch.hiddenReasonByTarget)

    if (patchChanged) {
      dispatch(applyRuntimePatch(evaluation.runtimePatch))
    }

    if (!areUnknownRecordEqual(responses, evaluation.nextResponses)) {
      dispatch(setResponses(evaluation.nextResponses))
    }

    if (currentPageId !== evaluation.nextCurrentPageId) {
      dispatch(setCurrentPage(evaluation.nextCurrentPageId))
    }
  }, [dispatch, evaluation, responses, currentPageId, runtime])

  return evaluation
}
