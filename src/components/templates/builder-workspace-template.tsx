import type { ReactNode } from 'react'

import { Card, CardContent } from '@/components/ui/card'

interface BuilderWorkspaceTemplateProps {
  left: ReactNode
  center: ReactNode
  right: ReactNode
}

export function BuilderWorkspaceTemplate({
  left,
  center,
  right,
}: BuilderWorkspaceTemplateProps) {
  return (
    <section className='grid gap-4 lg:grid-cols-[280px_1fr_320px]'>
      <aside>
        <Card className='h-full gap-0 py-0'>
          <CardContent className='p-4'>{left}</CardContent>
        </Card>
      </aside>
      <main>
        <Card className='h-full gap-0 py-0'>
          <CardContent className='p-4'>{center}</CardContent>
        </Card>
      </main>
      <aside>
        <Card className='h-full gap-0 py-0'>
          <CardContent className='p-4'>{right}</CardContent>
        </Card>
      </aside>
    </section>
  )
}
