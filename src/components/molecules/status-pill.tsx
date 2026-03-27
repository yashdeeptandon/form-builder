import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface StatusPillProps {
  label: string
  value: ReactNode
  tone?: 'default' | 'success' | 'warning'
}

export function StatusPill({ label, value, tone = 'default' }: StatusPillProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
        tone === 'default' && 'border-border bg-secondary text-secondary-foreground',
        tone === 'success' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700',
        tone === 'warning' && 'border-amber-500/30 bg-amber-500/10 text-amber-700',
      )}
    >
      <span className='text-muted-foreground'>{label}</span>
      <span>{value}</span>
    </div>
  )
}
