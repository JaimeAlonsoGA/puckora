import React, { useState } from 'react'
import { Body } from '@/components/building-blocks/typography'
import { Button } from '@/components/building-blocks/Button'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'

export interface QuoteCarouselProps { quotes: string[] }

export function QuoteCarousel({ quotes }: QuoteCarouselProps) {
  const [idx, setIdx] = useState(0)
  if (quotes.length === 0) return null
  return (
    <div className="bg-surface-tertiary border border-border rounded p-4 flex items-center gap-2">
      <Button variant="ghost" icon={<IconChevronLeft />} onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} />
      <Body className="flex-1 italic text-center">"{quotes[idx]}"</Body>
      <Button variant="ghost" icon={<IconChevronRight />} onClick={() => setIdx(i => Math.min(quotes.length - 1, i + 1))} disabled={idx === quotes.length - 1} />
    </div>
  )
}
