import React, { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useT } from '@/hooks/useT'
import { PageContainer } from '@/components/layout/PageContainer'
import { Heading, Body, Label } from '@/components/building-blocks/typography'
import { Stack, Row } from '@/components/building-blocks/layout'
import { Button } from '@/components/building-blocks/Button'
import { SilkCard, SilkBadge } from '@repo/ui'
import { IconSearch, IconBarcode, IconTrendingUp } from '@tabler/icons-react'

export const Route = createFileRoute('/analyzer/')({
    component: AnalyzerIndexPage,
})

const ASIN_RE = /^[A-Z0-9]{10}$/i
const AMAZON_URL_ASIN_RE = /(?:\/dp\/|\/product\/)([A-Z0-9]{10})/i

function extractAsin(raw: string): string | null {
    const trimmed = raw.trim()
    if (ASIN_RE.test(trimmed)) return trimmed.toUpperCase()
    const urlMatch = trimmed.match(AMAZON_URL_ASIN_RE)
    if (urlMatch?.[1]) return urlMatch[1].toUpperCase()
    return null
}

function AnalyzerIndexPage() {
    const { t } = useT('analyzer')
    const navigate = useNavigate()
    const [input, setInput] = useState('')
    const [error, setError] = useState<string | null>(null)

    function handleAnalyze(e: React.FormEvent) {
        e.preventDefault()
        const asin = extractAsin(input)
        if (!asin) {
            setError(t('errors.invalid'))
            return
        }
        setError(null)
        void navigate({ to: '/analyzer/$asin', params: { asin } })
    }

    const RECENT = [
        { asin: 'B09W2SNTWH', label: 'Example: Echo Dot' },
        { asin: 'B08L5VK4PZ', label: 'Example: Air Purifier' },
    ]

    return (
        <PageContainer>
            <Stack gap="2xl">
                <Stack gap="sm">
                    <Heading>{t('title')}</Heading>
                    <Body className="text-text-secondary">{t('subtitle')}</Body>
                </Stack>

                <SilkCard className="p-6 max-w-2xl">
                    <form onSubmit={handleAnalyze}>
                        <Stack gap="md">
                            <Label>{t('placeholder')}</Label>
                            <Row gap="sm" className="items-stretch">
                                <div className="flex-1 relative">
                                    <IconBarcode
                                        size={16}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                                    />
                                    <input
                                        value={input}
                                        onChange={e => { setInput(e.target.value); setError(null) }}
                                        placeholder="B09W2SNTWH or amazon.com/dp/..."
                                        className="w-full pl-9 pr-3 py-2.5 border border-border bg-surface-primary text-text-primary placeholder:text-text-muted text-sm outline-none focus:border-accent-primary font-mono"
                                        autoFocus
                                    />
                                </div>
                                <Button type="submit" variant="primary" size="md">
                                    <Row gap="xs" className="items-center">
                                        <IconSearch size={15} />
                                        <span>{t('analyze')}</span>
                                    </Row>
                                </Button>
                            </Row>
                            {error && (
                                <Body className="text-sm text-error">{error}</Body>
                            )}
                        </Stack>
                    </form>
                </SilkCard>

                <Stack gap="sm">
                    <Label className="text-text-muted">Quick examples</Label>
                    <Row gap="sm" className="flex-wrap">
                        {RECENT.map(r => (
                            <button
                                key={r.asin}
                                type="button"
                                onClick={() => void navigate({ to: '/analyzer/$asin', params: { asin: r.asin } })}
                                className="flex items-center gap-2 px-3 py-2 border border-border bg-surface-secondary hover:bg-surface-tertiary text-sm text-text-secondary transition-colors"
                            >
                                <IconTrendingUp size={13} />
                                <span className="font-mono text-xs">{r.asin}</span>
                                <span className="text-text-muted">— {r.label}</span>
                            </button>
                        ))}
                    </Row>
                </Stack>
            </Stack>
        </PageContainer>
    )
}
