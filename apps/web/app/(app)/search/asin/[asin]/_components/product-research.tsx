'use client'

import { useCallback, useRef, useState, useLayoutEffect } from 'react'
import { useTranslations } from 'next-intl'
import { DataCard } from '@puckora/ui'
import { Button, Caption } from '@puckora/ui'
import { FormTextarea } from '@/components/form/form-textarea'
import { useAppStore } from '@/lib/store'
import { MARK_STATE_VALUES, MARK_STATE_BUTTON_CLASS_NAMES, type MarkState } from '@/constants/app-state'
import type { ProductFinancial } from '@puckora/types'

interface ProductResearchProps {
    product: ProductFinancial
}

export function ProductResearch({ product }: ProductResearchProps) {
    const t = useTranslations('product')
    const asin = product.asin ?? ''
    const productName = product.title ?? asin

    // Per-item store selectors — never subscribe to full collection
    const markState = useAppStore((s) => s.markedProducts?.[asin]?.markState ?? null)
    const storedNote = useAppStore((s) => s.markedProducts?.[asin]?.note ?? '')

    const [localNote, setLocalNote] = useState(storedNote)
    const noteRef = useRef(localNote)
    // Sync note ref without assigning during render
    useLayoutEffect(() => { noteRef.current = localNote })

    // Stable callback — reads current state at call time, never re-creates
    const handleMarkToggle = useCallback((state: MarkState) => {
        const { markedProducts, markProduct, unmarkProduct } = useAppStore.getState()
        const current = markedProducts[asin]
        if (current?.markState === state) {
            unmarkProduct(asin)
        } else {
            markProduct({ asin, name: productName, markState: state, note: current?.note ?? '' })
        }
    }, [asin, productName])

    // Save note to store on blur — reads noteRef to avoid stale closure
    const handleNoteBlur = useCallback(() => {
        const { markedProducts, markProduct } = useAppStore.getState()
        const current = markedProducts[asin]
        if (!current) return
        markProduct({ ...current, note: noteRef.current })
    }, [asin])

    return (
        <DataCard title={t('research.title')}>
            <div className="flex flex-wrap gap-2">
                {MARK_STATE_VALUES.map((state) => (
                    <Button
                        key={state}
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkToggle(state)}
                        className={markState === state ? MARK_STATE_BUTTON_CLASS_NAMES[state] : ''}
                    >
                        {state}
                    </Button>
                ))}
            </div>
            {markState && (
                <div className="mt-3 flex flex-col gap-1">
                    <Caption className="text-muted-foreground">{t('research.notePlaceholder')}</Caption>
                    <FormTextarea
                        value={localNote}
                        onChange={(e) => setLocalNote(e.target.value)}
                        onBlur={handleNoteBlur}
                        placeholder={t('research.notePlaceholder')}
                        className="min-h-20 text-sm"
                    />
                </div>
            )}
        </DataCard>
    )
}
