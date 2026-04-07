'use client'

import { startTransition, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowUp } from 'lucide-react'
import { Button, Stack, Surface } from '@puckora/ui'
import {
    CONSTRAINT_FIELD_VALUES,
    SEARCH_INPUT_MODE_IDS,
    type ConstraintFieldId,
    type SearchInputMode,
} from '@/constants/search'
import {
    AMAZON_CATEGORY_VALUES,
    type AmazonCategoryId,
} from '@/constants/amazon-categories'
import { AsinTokenInput } from './_composer/asin-token-input'
import { InputModeMenu } from './_composer/input-mode-menu'
import { ConstraintBadgesInput } from './_composer/constraint-badges-input'
import { type ConstraintEntry } from './_composer/constraint-badge'

// ─── SearchComposer ───────────────────────────────────────────────────────────

export interface SearchComposerProps {
    onSearch: (query: string) => void
    isPending?: boolean
}

export function SearchComposer({ onSearch, isPending }: SearchComposerProps) {
    const [value, setValue] = useState('')
    const [inputMode, setInputMode] = useState<SearchInputMode>(SEARCH_INPUT_MODE_IDS.TEXT)
    const [constraints, setConstraints] = useState<Partial<Record<ConstraintFieldId, ConstraintEntry>>>({})
    const [categories, setCategories] = useState<Set<AmazonCategoryId>>(new Set())
    const editorRef = useRef<HTMLDivElement>(null)
    const t = useTranslations('search')

    const isTextMode = inputMode === SEARCH_INPUT_MODE_IDS.TEXT
    const hasTextValue = value.trim().length > 0
    const hasConstraints =
        CONSTRAINT_FIELD_VALUES.some(id => {
            const v = constraints[id]
            return v ? v.min.trim() !== '' || v.max.trim() !== '' : false
        }) || categories.size > 0
    const canSubmit = isTextMode ? hasTextValue : hasConstraints

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
        if (isTextMode) {
            const q = value.trim()
            if (!q) return
            onSearch(q)
        } else {
            if (!hasConstraints) return
            const parts: string[] = []
            for (const id of CONSTRAINT_FIELD_VALUES) {
                const v = constraints[id]
                if (!v) continue
                if (v.min.trim()) parts.push(`${id}_min:${v.min.trim()}`)
                if (v.max.trim()) parts.push(`${id}_max:${v.max.trim()}`)
            }
            if (categories.size > 0 && categories.size < AMAZON_CATEGORY_VALUES.length) {
                parts.push(`categories:${[...categories].join(',')}`)
            }
            onSearch(parts.join(' '))
        }
    }

    function handleModeChange(m: SearchInputMode) {
        startTransition(() => { setInputMode(m) })
        if (m === SEARCH_INPUT_MODE_IDS.TEXT) {
            requestAnimationFrame(() => editorRef.current?.focus())
        }
    }

    return (
        <Surface variant="card" padding="md" className="w-full shadow-sm">
            {/* Input area — switches between text and constraint modes */}
            <div className="mb-3">
                {isTextMode ? (
                    <AsinTokenInput
                        value={value}
                        onValueChange={setValue}
                        onSubmit={submit}
                        placeholder={t('entry.placeholder')}
                        disabled={isPending}
                        autoFocus
                        editorRef={editorRef}
                    />
                ) : (
                    <ConstraintBadgesInput
                        constraints={constraints}
                        onUpdate={updateConstraint}
                        categories={categories}
                        onToggleCategory={toggleCategory}
                        onSelectAllCategories={selectAllCategories}
                        onResetCategories={resetCategories}
                        disabled={isPending}
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
