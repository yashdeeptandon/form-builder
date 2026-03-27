interface SectionTitleProps {
  title: string
  subtitle?: string
}

export function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <header className='space-y-1'>
      <h1 className='text-2xl font-semibold tracking-tight text-foreground'>{title}</h1>
      {subtitle ? <p className='text-sm text-muted-foreground'>{subtitle}</p> : null}
    </header>
  )
}
