'use client'

import { startTransition, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button, Caption, DarkPanel, Label, Stack } from '@puckora/ui'
import { formatCount } from '@puckora/utils'
import type { SearchOverviewStats } from '@puckora/utils'
import type { ProductFinancial } from '@puckora/types'
import { FormNumberInput } from '@/components/form'
import {
    SEARCH_OVERVIEW_DEFAULT_PARAM_IDS,
    SEARCH_OVERVIEW_PARAM,
    SEARCH_OVERVIEW_PARAM_VALUES,
    SEARCH_OVERVIEW_QUICK_CHECK_DEFAULTS,
    type SearchOverviewParamId,
    type SearchOverviewQuickCheckThresholds,
} from '@/constants/search'
import {
    OVERVIEW_QUICK_CHECK_STATUS,
    QUICK_CHECK_STATUS_TEXT_CLASS,
    useOverviewQuickChecks,
} from '@/hooks/use-verdict-gates'

interface VerdictPanelProps {
    products: ProductFinancial[]
    stats: SearchOverviewStats
    averagePrice: number | null
    query: string
    marketplace: string
}

type QuickCheckThresholdDraft = Record<keyof SearchOverviewQuickCheckThresholds, string>

type QuickCheckDefinition = {
    id: SearchOverviewParamId
    labelKey: 'quickChecks.weight.label' | 'quickChecks.reviews.label' | 'quickChecks.amazonCut.label' | 'quickChecks.price.label'
    thresholdKey: keyof SearchOverviewQuickCheckThresholds
    inputId: string
    inputLabelKey:
    | 'quickChecks.weight.thresholdLabel'
    | 'quickChecks.reviews.thresholdLabel'
    | 'quickChecks.amazonCut.thresholdLabel'
    | 'quickChecks.price.thresholdLabel'
    min: number
    step: number
    inputSuffixKey?: 'quickChecks.weight.suffix' | 'quickChecks.amazonCut.suffix' | 'quickChecks.price.suffix'
}

const QUICK_CHECK_DEFINITIONS: Record<SearchOverviewParamId, QuickCheckDefinition> = {
    [SEARCH_OVERVIEW_PARAM.WEIGHT]: {
        id: SEARCH_OVERVIEW_PARAM.WEIGHT,
        labelKey: 'quickChecks.weight.label',
        thresholdKey: 'maxAvgWeightKg',
        inputId: 'quick-check-weight-threshold',
        inputLabelKey: 'quickChecks.weight.thresholdLabel',
        min: 0.1,
        step: 0.1,
        inputSuffixKey: 'quickChecks.weight.suffix',
    },
    [SEARCH_OVERVIEW_PARAM.REVIEWS]: {
        id: SEARCH_OVERVIEW_PARAM.REVIEWS,
        labelKey: 'quickChecks.reviews.label',
        thresholdKey: 'reviewWallCount',
        inputId: 'quick-check-review-threshold',
        inputLabelKey: 'quickChecks.reviews.thresholdLabel',
        min: 1,
        step: 10,
    },
    [SEARCH_OVERVIEW_PARAM.AMAZON_CUT]: {
        id: SEARCH_OVERVIEW_PARAM.AMAZON_CUT,
        labelKey: 'quickChecks.amazonCut.label',
        thresholdKey: 'maxAmazonCutPct',
        inputId: 'quick-check-amazon-cut-threshold',
        inputLabelKey: 'quickChecks.amazonCut.thresholdLabel',
        min: 1,
        step: 1,
        inputSuffixKey: 'quickChecks.amazonCut.suffix',
    },
    [SEARCH_OVERVIEW_PARAM.PRICE]: {
        id: SEARCH_OVERVIEW_PARAM.PRICE,
        labelKey: 'quickChecks.price.label',
        thresholdKey: 'maxPriceUsd',
        inputId: 'quick-check-price-threshold',
        inputLabelKey: 'quickChecks.price.thresholdLabel',
        min: 1,
        step: 1,
        inputSuffixKey: 'quickChecks.price.suffix',
    },
}

function parseThreshold(value: string, fallback: number): number {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function toDraftValues(thresholds: SearchOverviewQuickCheckThresholds): QuickCheckThresholdDraft {
    return {
        maxAvgWeightKg: String(thresholds.maxAvgWeightKg),
        reviewWallCount: String(thresholds.reviewWallCount),
        maxAmazonCutPct: String(thresholds.maxAmazonCutPct),
        maxPriceUsd: String(thresholds.maxPriceUsd),
    }
}

function SmallIconButton({
    label,
    icon,
    onClick,
}: {
    label: string
    icon: React.ReactNode
    onClick: () => void
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 px-0 text-white/45 hover:bg-white/6 hover:text-white"
            aria-label={label}
            onClick={onClick}
            icon={icon}
        />
    )
}

export function VerdictPanel({ products, stats, averagePrice, query, marketplace }: VerdictPanelProps) {
    const t = useTranslations('search')
    const [activeParamIds, setActiveParamIds] = useState<SearchOverviewParamId[]>(
        () => [...SEARCH_OVERVIEW_DEFAULT_PARAM_IDS],
    )
    const [thresholdDraft, setThresholdDraft] = useState<QuickCheckThresholdDraft>(
        () => toDraftValues(SEARCH_OVERVIEW_QUICK_CHECK_DEFAULTS),
    )
    const [editingParamId, setEditingParamId] = useState<SearchOverviewParamId | null>(null)
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)

    const thresholds = useMemo<SearchOverviewQuickCheckThresholds>(() => ({
        maxAvgWeightKg: parseThreshold(thresholdDraft.maxAvgWeightKg, SEARCH_OVERVIEW_QUICK_CHECK_DEFAULTS.maxAvgWeightKg),
        reviewWallCount: parseThreshold(thresholdDraft.reviewWallCount, SEARCH_OVERVIEW_QUICK_CHECK_DEFAULTS.reviewWallCount),
        maxAmazonCutPct: parseThreshold(thresholdDraft.maxAmazonCutPct, SEARCH_OVERVIEW_QUICK_CHECK_DEFAULTS.maxAmazonCutPct),
        maxPriceUsd: parseThreshold(thresholdDraft.maxPriceUsd, SEARCH_OVERVIEW_QUICK_CHECK_DEFAULTS.maxPriceUsd),
    }), [thresholdDraft])

    const { checks, sampledCount } = useOverviewQuickChecks(products, stats, averagePrice, activeParamIds, thresholds)

    const missingParamIds = SEARCH_OVERVIEW_PARAM_VALUES.filter((paramId) => !activeParamIds.includes(paramId))

    const handleThresholdChange = (key: keyof SearchOverviewQuickCheckThresholds, nextValue: string) => {
        setThresholdDraft((current) => ({
            ...current,
            [key]: nextValue,
        }))
    }

    const handleDelete = (paramId: SearchOverviewParamId) => {
        setActiveParamIds((current) => current.filter((id) => id !== paramId))
        setEditingParamId((current) => (current === paramId ? null : current))
    }

    const handleAddParam = (paramId: SearchOverviewParamId) => {
        startTransition(() => {
            setActiveParamIds((current) => [...current, paramId])
            setEditingParamId(paramId)
            setIsAddMenuOpen(false)
        })
    }

    const handleEditOpen = (paramId: SearchOverviewParamId) => {
        startTransition(() => setEditingParamId(paramId))
    }

    const handleEditClose = () => {
        startTransition(() => setEditingParamId(null))
    }

    return (
        <DarkPanel
            title={`"${query}"`}
            subtitle={`${formatCount(stats.total_products)} ${t('overview.productsCount')} · ${formatCount(sampledCount)} ${t('quickChecks.sampledLabel')}`}
        >
            {checks.map((check) => {
                const definition = QUICK_CHECK_DEFINITIONS[check.id]
                const isEditing = editingParamId === check.id
                const statusClassName = QUICK_CHECK_STATUS_TEXT_CLASS[check.status]
                const statusIcon = check.status === OVERVIEW_QUICK_CHECK_STATUS.PASS
                    ? '✓'
                    : check.status === OVERVIEW_QUICK_CHECK_STATUS.WARN
                        ? '!'
                        : '✗'

                return (
                    <div key={check.id} className="group min-h-11 py-2">
                        {isEditing ? (
                            <Stack gap="2" className="animate-in fade-in-0 slide-in-from-right-1 duration-150">
                                <Label htmlFor={definition.inputId} className="text-white/70">
                                    {t(definition.inputLabelKey)}
                                </Label>
                                <Stack direction="row" align="center" gap="2">
                                    <FormNumberInput
                                        id={definition.inputId}
                                        min={definition.min}
                                        step={definition.step}
                                        value={thresholdDraft[definition.thresholdKey]}
                                        onChange={(event) => handleThresholdChange(definition.thresholdKey, event.currentTarget.value)}
                                        className="h-9 border-white/10 bg-white/4 px-3 text-sm text-white hover:border-white/20 focus:ring-white/25"
                                    />
                                    {definition.inputSuffixKey && (
                                        <Caption as="span" className="whitespace-nowrap text-white/45">
                                            {t(definition.inputSuffixKey)}
                                        </Caption>
                                    )}
                                    <Stack direction="row" gap="1" align="center">
                                        <SmallIconButton
                                            label={t('quickChecks.saveAria')}
                                            icon={<Check size={14} aria-hidden="true" />}
                                            onClick={handleEditClose}
                                        />
                                        <SmallIconButton
                                            label={t('quickChecks.cancelAria')}
                                            icon={<X size={14} aria-hidden="true" />}
                                            onClick={handleEditClose}
                                        />
                                    </Stack>
                                </Stack>
                            </Stack>
                        ) : (
                            <Stack
                                direction="row"
                                align="center"
                                justify="between"
                                gap="2"
                                className="animate-in fade-in-0 slide-in-from-left-1 duration-150"
                            >
                                <Stack direction="row" align="center" gap="2" className="min-w-0">
                                    <Caption as="span" className={`${statusClassName} w-3.5 shrink-0 text-center text-sm font-semibold`}>
                                        {statusIcon}
                                    </Caption>
                                    <Caption as="span" className={`${statusClassName} truncate text-sm`}>
                                        {check.summary}
                                    </Caption>
                                </Stack>
                                <Stack
                                    direction="row"
                                    align="center"
                                    gap="1"
                                    className="opacity-0 translate-x-1 transition-[opacity,transform] duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100"
                                >
                                    <SmallIconButton
                                        label={t('quickChecks.editAria', { param: t(definition.labelKey) })}
                                        icon={<Pencil size={14} aria-hidden="true" />}
                                        onClick={() => handleEditOpen(check.id)}
                                    />
                                    <SmallIconButton
                                        label={t('quickChecks.deleteAria', { param: t(definition.labelKey) })}
                                        icon={<Trash2 size={14} aria-hidden="true" />}
                                        onClick={() => handleDelete(check.id)}
                                    />
                                </Stack>
                            </Stack>
                        )}
                    </div>
                )
            })}

            <div className="pt-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-white/60 hover:bg-white/6 hover:text-white"
                    icon={<Plus size={14} aria-hidden="true" />}
                    iconRight={<ChevronDown size={14} aria-hidden="true" className={isAddMenuOpen ? 'rotate-180 transition-transform duration-150' : 'transition-transform duration-150'} />}
                    onClick={() => startTransition(() => setIsAddMenuOpen((current) => !current))}
                >
                    {t('quickChecks.addParam')}
                </Button>

                {isAddMenuOpen && (
                    <Stack
                        gap="1"
                        className="mt-2 rounded-lg border border-white/8 bg-white/3 p-2 animate-in fade-in-0 zoom-in-95 duration-150"
                    >
                        {missingParamIds.length > 0 ? missingParamIds.map((paramId) => {
                            const definition = QUICK_CHECK_DEFINITIONS[paramId]
                            return (
                                <Button
                                    key={paramId}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 justify-start px-2 text-left text-white/70 hover:bg-white/6 hover:text-white"
                                    onClick={() => handleAddParam(paramId)}
                                >
                                    {t(definition.labelKey)}
                                </Button>
                            )
                        }) : (
                            <Caption as="p" className="px-2 py-1 text-white/40">
                                {t('quickChecks.noMoreParams')}
                            </Caption>
                        )}
                    </Stack>
                )}
            </div>
        </DarkPanel>
    )
}
