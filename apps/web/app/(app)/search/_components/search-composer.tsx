'use client'

import { startTransition, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowUp } from 'lucide-react'
import { Button, Stack, Surface } from '@puckora/ui'
import {
    SEARCH_AVAILABLE_INPUT_MODE_VALUES,
    SEARCH_INPUT_MODE_IDS,
    type ConstraintFieldId,
    type SearchInputMode,
} from '@/constants/search'
import {
    AMAZON_CATEGORY_VALUES,
    type AmazonCategoryId,
} from '@/constants/amazon-categories'
import {
    SEARCH_ASIN_INPUT_STATUS,
    resolveSearchAsinInput,
} from '@/schemas/scrape'
import { AsinTokenInput } from './_composer/asin-token-input'
import { InputModeMenu } from './_composer/input-mode-menu'
import { ConstraintBadgesInput } from './_composer/constraint-badges-input'
import { type ConstraintEntry } from './_composer/constraint-badge'

// ─── SearchComposer ───────────────────────────────────────────────────────────

export interface SearchComposerProps {
    onSubmit: (payload: SearchComposerSubmitPayload) => void
    isPending?: boolean
}

export type SearchComposerSubmitPayload =
    | { type: 'keyword'; keyword: string }
    | { type: 'asin'; asin: string }
    | { type: 'discover'; constraints: Partial<Record<ConstraintFieldId, ConstraintEntry>>; categories: AmazonCategoryId[] }

export function SearchComposer({ onSubmit, isPending }: SearchComposerProps) {
    const [value, setValue] = useState('')
    const [inputMode, setInputMode] = useState<SearchInputMode>(SEARCH_INPUT_MODE_IDS.KEYWORD)
    const [constraints, setConstraints] = useState<Partial<Record<ConstraintFieldId, ConstraintEntry>>>({})
    const [categories, setCategories] = useState<Set<AmazonCategoryId>>(new Set())
    const editorRef = useRef<HTMLDivElement>(null)
    const t = useTranslations('search')
    const availableModeSet = useMemo(
        () => new Set<SearchInputMode>(SEARCH_AVAILABLE_INPUT_MODE_VALUES),
        [],
    )

    const trimmedValue = value.trim()
    const asinResolution = useMemo(() => resolveSearchAsinInput(value), [value])

    const canSubmit = (() => {
        if (inputMode === SEARCH_INPUT_MODE_IDS.KEYWORD) return trimmedValue.length > 0
        if (inputMode === SEARCH_INPUT_MODE_IDS.ASIN) return asinResolution.status === SEARCH_ASIN_INPUT_STATUS.VALID
        if (inputMode === SEARCH_INPUT_MODE_IDS.DISCOVER) return Object.keys(constraints).length > 0 || categories.size > 0
        return false
    })()

    function updateConstraint(id: ConstraintFieldId, val: ConstraintEntry) {
        setConstraints(cur => ({ ...cur, [id]: val }))
    }

    function toggleCategory(id: AmazonCategoryId) {
        setCategories(cur => {
            const next = new Set(cur)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    function selectAllCategories() {
        setCategories(new Set(AMAZON_CATEGORY_VALUES))
    }

    function resetCategories() {
        setCategories(new Set())
    }

    function submit() {
        if (inputMode === SEARCH_INPUT_MODE_IDS.KEYWORD) {
            if (!trimmedValue) return
            onSubmit({ type: 'keyword', keyword: trimmedValue })
            return
        }

        if (inputMode === SEARCH_INPUT_MODE_IDS.ASIN && asinResolution.asin) {
            onSubmit({ type: 'asin', asin: asinResolution.asin })
            return
        }

        if (inputMode === SEARCH_INPUT_MODE_IDS.DISCOVER) {
            onSubmit({ type: 'discover', constraints, categories: Array.from(categories) })
        }
    }

    function handleModeChange(m: SearchInputMode) {
        if (!availableModeSet.has(m)) return
        startTransition(() => {
            setInputMode(m)
            setValue('')
        })
        if (m === SEARCH_INPUT_MODE_IDS.KEYWORD || m === SEARCH_INPUT_MODE_IDS.ASIN) {
            requestAnimationFrame(() => editorRef.current?.focus())
        }
    }

    const isConstraintMode = inputMode === SEARCH_INPUT_MODE_IDS.DISCOVER
    const placeholder = inputMode === SEARCH_INPUT_MODE_IDS.ASIN
        ? t('entry.placeholderAsin')
        : t('entry.placeholderKeyword')

    return (
        <Surface variant="card" padding="md" className="w-full shadow-sm">
            {/* Input area — switches between text and constraint modes */}
            <div className="mb-3">
                {isConstraintMode ? (
                    <ConstraintBadgesInput
                        constraints={constraints}
                        onUpdate={updateConstraint}
                        categories={categories}
                        onToggleCategory={toggleCategory}
                        onSelectAllCategories={selectAllCategories}
                        onResetCategories={resetCategories}
                    />
                ) : (
                    <AsinTokenInput
                        value={value}
                        onValueChange={setValue}
                        onSubmit={submit}
                        placeholder={placeholder}
                        tokenMode={inputMode === SEARCH_INPUT_MODE_IDS.ASIN ? 'single-asin' : 'amazon-search'}
                        disabled={isPending}
                        autoFocus
                        editorRef={editorRef}
                    />
                )}
            </div>

            {/* Toolbar: mode selector left, submit right */}
            <Stack direction="row" justify="between" align="center">
                <InputModeMenu mode={inputMode} onModeChange={handleModeChange} />
                <Button
                    variant="primary"
                    size="sm"
                    loading={isPending}
                    disabled={!canSubmit || isPending}
                    onClick={submit}
                    aria-label={t('entry.searchButton')}
                    className="h-8 w-8 p-0"
                >
                    <ArrowUp size={16} aria-hidden="true" />
                </Button>
            </Stack>
        </Surface>
    )
}
