'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import { Button, Caption, Stack } from '@puckora/ui'
import { FormInput } from '@/components/form'
import {
    KEYWORD_SUGGESTIONS,
} from '@/constants/search'

// ---------------------------------------------------------------------------
// Keyword panel
// ---------------------------------------------------------------------------

export function KeywordPanel({ onSearch, isPending }: { onSearch: (q: string) => void; isPending?: boolean }) {
    const [value, setValue] = useState('')
    const t = useTranslations('search')

    function submit() {
        const q = value.trim()
        if (q) onSearch(q)
    }

    return (
        <Stack gap="4">
            {/* Large search input with inset icon */}
            <div className="relative">
                <Search
                    size={18}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <FormInput
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isPending && submit()}
                    placeholder={t('keywordPlaceholder')}
                    className="h-14 rounded-xl pl-11 pr-4 text-base"
                    autoFocus
                    disabled={isPending}
                />
            </div>

            <Button variant="primary" fullWidth size="md" onClick={submit} loading={isPending}>
                {t('search')}
            </Button>

            {/* Suggestions */}
            <Stack gap="2">
                <Caption as="p">{t('peopleSuggest')}</Caption>
                <Stack direction="row" gap="1-5" wrap>
                    {KEYWORD_SUGGESTIONS.map((kw) => (
                        <Button
                            key={kw}
                            onClick={() => onSearch(kw)}
                            variant="ghost"
                            size="sm"
                            className="h-auto rounded-full border border-border-subtle bg-background px-3 py-1.5 hover:border-border"
                        >
                            {kw}
                        </Button>
                    ))}
                </Stack>
            </Stack>
        </Stack>
    )
}
