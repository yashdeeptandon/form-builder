import { Button } from '@/components/ui/button'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  selectAllFields,
  selectBuilderWarnings,
  selectFormMetadata,
  selectPagesInOrder,
  selectRules,
} from '@/domains/builder/selectors'
import { clearWarnings } from '@/domains/builder/builder.slice'
import { setMode } from '@/domains/ui/ui.slice'

import { StatusPill } from '@/components/molecules/status-pill'

export function FoundationStatusPanel() {
  const dispatch = useAppDispatch()
  const metadata = useAppSelector(selectFormMetadata)
  const pages = useAppSelector(selectPagesInOrder)
  const fields = useAppSelector(selectAllFields)
  const rules = useAppSelector(selectRules)
  const warnings = useAppSelector(selectBuilderWarnings)
  const mode = useAppSelector((state) => state.ui.mode)

  return (
    <section className='space-y-4'>
      <div className='space-y-2'>
        <h2 className='text-sm font-medium uppercase tracking-wide text-muted-foreground'>
          Architecture Status
        </h2>
        <p className='text-sm text-foreground'>
          Redux, React Query, schema contracts, and Atomic UI layers are wired.
        </p>
      </div>

      <div className='flex flex-wrap gap-2'>
        <StatusPill label='Form' value={metadata.name} tone='success' />
        <StatusPill label='Pages' value={pages.length} />
        <StatusPill label='Fields' value={fields.length} />
        <StatusPill label='Rules' value={rules.length} tone='warning' />
        <StatusPill
          label='Warnings'
          value={warnings.length}
          tone={warnings.length > 0 ? 'warning' : 'success'}
        />
      </div>

      <div className='flex items-center gap-2'>
        <Button
          variant={mode === 'builder' ? 'default' : 'outline'}
          onClick={() => dispatch(setMode('builder'))}
        >
          Builder Mode
        </Button>
        <Button
          variant={mode === 'preview' ? 'default' : 'outline'}
          onClick={() => dispatch(setMode('preview'))}
        >
          Preview Mode
        </Button>
      </div>

      {warnings.length > 0 ? (
        <Button variant='ghost' onClick={() => dispatch(clearWarnings())}>
          Clear Warnings
        </Button>
      ) : null}
    </section>
  )
}
