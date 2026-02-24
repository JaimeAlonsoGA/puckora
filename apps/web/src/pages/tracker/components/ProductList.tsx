import React, { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useT } from '@/hooks/useT'
import { useTrackerProducts, useDeleteTrackedProduct, useUpdateTrackedProduct } from '@/hooks/useTrackerProducts'
import { Stack, Row } from '@/components/building-blocks/layout'
import { Body, Caption, Label, Mono } from '@/components/building-blocks/typography'
import { SilkCard, SilkBadge, SilkButton } from '@repo/ui'
import { Button } from '@/components/building-blocks/Button'
import { formatCurrency, formatNumber, formatRelativeTime } from '@repo/utils'
import { IconTrash, IconTrendingUp, IconExternalLink, IconTag, IconX } from '@tabler/icons-react'

interface ProductJoin {
  id: string
  asin: string | null
  title: string | null
  main_image_url: string | null
  price: number | null
  bsr: number | null
  rating: number | null
  review_count: number | null
  monthly_sales_est: number | null
  marketplace: string | null
  brand: string | null
  bsr_category: string | null
}

type TrackedProductWithProduct = {
  id: string
  product_id: string
  notes: string | null
  tags: string[] | null
  stage: string
  price_alert_below: number | null
  bsr_alert_above: number | null
  bsr_alert_below: number | null
  rating_alert_below: number | null
  tracked_price: number | null
  tracked_bsr: number | null
  tracked_rating: number | null
  tracked_review_count: number | null
  created_at: string
  updated_at: string
  product: ProductJoin | null
}

const STAGE_COLORS: Record<string, 'gold' | 'success' | 'error' | 'neutral' | 'warning'> = {
  idea: 'neutral',
  researching: 'gold',
  sourcing: 'warning',
  ordered: 'success',
  live: 'success',
  archived: 'neutral',
}

const STAGES = ['idea', 'researching', 'sourcing', 'ordered', 'live', 'archived']

export function ProductList() {
  const { t } = useT('tracker')
  const { data: products = [] } = useTrackerProducts()
  const deleteMutation = useDeleteTrackedProduct()
  const updateMutation = useUpdateTrackedProduct()
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteValue, setNoteValue] = useState('')

  const typed = products as unknown as TrackedProductWithProduct[]

  // Collect all unique tags
  const allTags = Array.from(new Set(typed.flatMap(p => p.tags ?? [])))

  const filtered = typed.filter(p => {
    const title = p.product?.title?.toLowerCase() ?? ''
    const asin = p.product?.asin?.toLowerCase() ?? ''
    const q = search.toLowerCase()
    const matchesSearch = q === '' || title.includes(q) || asin.includes(q)
    const matchesTag = tagFilter == null || (p.tags ?? []).includes(tagFilter)
    return matchesSearch && matchesTag
  })

  function startEditNote(id: string, current: string | null) {
    setEditingNote(id)
    setNoteValue(current ?? '')
  }

  function saveNote(id: string) {
    updateMutation.mutate({ id, notes: noteValue })
    setEditingNote(null)
  }

  function addTag(id: string, tags: string[], tag: string) {
    if (!tag.trim() || tags.includes(tag.trim())) return
    updateMutation.mutate({ id, tags: [...tags, tag.trim()] })
  }

  function removeTag(id: string, tags: string[], tag: string) {
    updateMutation.mutate({ id, tags: tags.filter(t => t !== tag) })
  }

  return (
    <Stack gap="md">
      {/* Toolbar */}
      <Row gap="sm" className="flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('filters.search')}
          className="flex-1 min-w-[200px] px-3 py-2 border border-border bg-surface-primary text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-primary"
        />
        <select
          value={tagFilter ?? ''}
          onChange={e => setTagFilter(e.target.value || null)}
          className="px-3 py-2 border border-border bg-surface-primary text-sm text-text-primary outline-none focus:border-accent-primary"
        >
          <option value="">{t('filters.allTags')}</option>
          {allTags.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </Row>

      {/* List */}
      {filtered.map(item => {
        const p = item.product
        const amazonUrl = p?.asin
          ? `https://www.amazon.com/dp/${p.asin}`
          : null

        return (
          <SilkCard key={item.id} className="p-4">
            <Stack gap="sm">
              {/* Row 1: image + title + actions */}
              <Row gap="md" className="items-start">
                {/* Thumbnail */}
                {p?.main_image_url && (
                  <div className="w-16 h-16 shrink-0 border border-border bg-surface-secondary overflow-hidden flex items-center justify-center">
                    <img src={p.main_image_url} alt={p.title ?? ''} className="w-full h-full object-contain" />
                  </div>
                )}

                {/* Info */}
                <Stack gap="xs" className="flex-1 min-w-0">
                  <Row gap="sm" className="items-start justify-between">
                    <Label className="font-medium leading-snug line-clamp-2">
                      {p?.title ?? item.product_id}
                    </Label>
                    <Row gap="xs" className="shrink-0">
                      {p?.asin && (
                        <Link to="/analyzer/$asin" params={{ asin: p.asin }}>
                          <Button variant="ghost" size="sm" title={t('card.analyze')}>
                            <IconTrendingUp size={14} />
                          </Button>
                        </Link>
                      )}
                      {amazonUrl && (
                        <a href={amazonUrl} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="sm" title={t('card.viewOnAmazon')}>
                            <IconExternalLink size={14} />
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                        title={t('card.remove')}
                      >
                        <IconTrash size={14} className="text-error" />
                      </Button>
                    </Row>
                  </Row>

                  {p?.asin && (
                    <Mono className="text-xs text-text-muted">{p.asin}</Mono>
                  )}

                  {/* Metrics */}
                  <Row gap="md" className="flex-wrap">
                    {(p?.price ?? 0) > 0 && (
                      <Caption className="text-text-secondary">{formatCurrency(p!.price!)}</Caption>
                    )}
                    {(p?.bsr ?? 0) > 0 && (
                      <Caption className="text-text-secondary">BSR #{formatNumber(p!.bsr!)}</Caption>
                    )}
                    {(p?.rating ?? 0) > 0 && (
                      <Caption className="text-text-secondary">★ {p!.rating!.toFixed(1)}</Caption>
                    )}
                    {(p?.review_count ?? 0) > 0 && (
                      <Caption className="text-text-muted">({formatNumber(p!.review_count!)})</Caption>
                    )}
                  </Row>
                </Stack>
              </Row>

              {/* Row 2: stage + tags + saved date */}
              <Row gap="sm" className="flex-wrap items-center">
                {/* Stage selector */}
                <select
                  value={item.stage}
                  onChange={e => updateMutation.mutate({ id: item.id, stage: e.target.value })}
                  className="px-2 py-0.5 text-xs border border-border bg-surface-primary text-text-primary outline-none focus:border-accent-primary"
                >
                  {STAGES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>

                {/* Tags */}
                <Row gap="xs" className="flex-wrap items-center">
                  {(item.tags ?? []).map(tag => (
                    <SilkBadge key={tag} variant="muted" className="flex items-center gap-1">
                      <IconTag size={10} />
                      <span>{tag}</span>
                      <button
                        onClick={() => removeTag(item.id, item.tags ?? [], tag)}
                        className="hover:text-error transition-colors"
                      >
                        <IconX size={9} />
                      </button>
                    </SilkBadge>
                  ))}
                  <TagInput onAdd={tag => addTag(item.id, item.tags ?? [], tag)} placeholder={t('card.addTag')} />
                </Row>

                <Caption className="ml-auto text-text-muted shrink-0">
                  {t('card.savedOn', { date: formatRelativeTime(item.created_at) })}
                </Caption>
              </Row>

              {/* Row 3: notes */}
              {editingNote === item.id ? (
                <Row gap="sm" className="items-end">
                  <textarea
                    value={noteValue}
                    onChange={e => setNoteValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border bg-surface-primary text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-primary resize-none"
                    rows={2}
                    autoFocus
                    placeholder={t('card.addNote')}
                  />
                  <Stack gap="xs">
                    <Button variant="primary" size="sm" onClick={() => saveNote(item.id)}>Save</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingNote(null)}>Cancel</Button>
                  </Stack>
                </Row>
              ) : (
                <button
                  className="text-left"
                  onClick={() => startEditNote(item.id, item.notes)}
                >
                  {item.notes
                    ? <Body className="text-sm text-text-secondary line-clamp-2">{item.notes}</Body>
                    : <Caption className="text-text-muted italic">{t('card.addNote')}</Caption>
                  }
                </button>
              )}
            </Stack>
          </SilkCard>
        )
      })}
    </Stack>
  )
}

// ─── Inline tag input ──────────────────────────────────────────────────────────────
function TagInput({ onAdd, placeholder }: { onAdd: (t: string) => void; placeholder: string }) {
  const [val, setVal] = useState('')
  return (
    <input
      value={val}
      onChange={e => setVal(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter' && val.trim()) {
          onAdd(val.trim())
          setVal('')
        }
      }}
      placeholder={placeholder}
      className="px-2 py-0.5 text-xs border border-dashed border-border bg-transparent text-text-muted placeholder:text-text-muted focus:outline-none focus:border-accent-primary w-24"
    />
  )
}
