/**
 * CostPanel — single-screen cost calculator.
 *
 * Left column: all inputs (pre-filled from ProductContext).
 * Right column: live-updating results (debounced 300ms).
 * MOQ tier switcher: 100 / 300 / 500 / 1000.
 * Traffic-light margin badge + rule-based AI margin advisor.
 */
import React, { useEffect, useState, useCallback } from 'react'
import { useT } from '@/hooks/useT'
import { useProductContext } from '@/contexts/ProductContext'
import { useCostEstimate } from '@/hooks/useCostEstimate'
import { Stack, Row, Grid } from '@/components/building-blocks/layout'
import { Heading, Body, Caption, Label } from '@/components/building-blocks/typography'
import { Button } from '@/components/building-blocks/Button'
import { SilkCard, SilkBadge, SilkAlert, KPICard } from '@repo/ui'
import { CostBreakdownPanel } from './CostBreakdownPanel'
import { formatCurrency, formatPercent } from '@repo/utils'
import type { CostCalculatorInput, ShippingMethod, Marketplace } from '@repo/types'
import { IconCalculator, IconRefresh, IconShare } from '@tabler/icons-react'

const TIERS = [100, 300, 500, 1000] as const
type Tier = typeof TIERS[number]

function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(t)
    }, [value, delay])
    return debounced
}

interface FormState {
    productTitle: string
    asin: string
    category: string
    marketplace: Marketplace
    weightKg: string
    lengthCm: string
    widthCm: string
    heightCm: string
    supplierPriceUSD: string
    moq: string
    shippingMethod: ShippingMethod
    shippingCostManualUSD: string
    targetSellPrice: string
}

const DEFAULT_FORM: FormState = {
    productTitle: '',
    asin: '',
    category: 'Electronics',
    marketplace: 'US',
    weightKg: '',
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    supplierPriceUSD: '',
    moq: '300',
    shippingMethod: 'sea',
    shippingCostManualUSD: '',
    targetSellPrice: '',
}

function formToInput(form: FormState, moq: number): CostCalculatorInput | null {
    const weight = parseFloat(form.weightKg)
    const supplier = parseFloat(form.supplierPriceUSD)
    const l = parseFloat(form.lengthCm)
    const w = parseFloat(form.widthCm)
    const h = parseFloat(form.heightCm)

    if (!weight || !supplier || !l || !w || !h) return null
    if (weight <= 0 || supplier <= 0) return null

    return {
        asin: form.asin || undefined,
        productTitle: form.productTitle || undefined,
        weightKg: weight,
        dimensionsCm: { lengthCm: l, widthCm: w, heightCm: h },
        category: form.category,
        marketplace: form.marketplace,
        supplierPriceUSD: supplier,
        moq,
        shippingMethod: form.shippingMethod,
        shippingCostManualUSD: form.shippingCostManualUSD ? parseFloat(form.shippingCostManualUSD) : undefined,
        targetSellPrice: form.targetSellPrice ? parseFloat(form.targetSellPrice) : undefined,
    }
}

function trafficLight(marginPct: number): { color: string; label: string; variant: 'success' | 'warning' | 'error' } {
    if (marginPct >= 30) return { color: 'var(--sf-success)', label: 'Strong', variant: 'success' }
    if (marginPct >= 15) return { color: 'var(--sf-gold)', label: 'Marginal', variant: 'warning' }
    return { color: 'var(--sf-scarlet)', label: 'Poor', variant: 'error' }
}

function marginAdvice(marginPct: number): string {
    if (marginPct >= 30) return 'Margin is healthy. Consider increasing ad spend to grow market share.'
    if (marginPct >= 20) return 'Good margin. Look for sourcing savings to push above 30%.'
    if (marginPct >= 15) return 'Marginal. Negotiate supplier price down or find a lighter packaging option.'
    if (marginPct >= 0) return 'Low margin. Raise your sell price or reduce COGS — this is risky to launch.'
    return 'Negative margin. This product is not viable at current inputs.'
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Row gap="sm" align="center">
            <Label style={{ width: 140, flexShrink: 0, color: 'var(--sf-text-muted)', fontSize: '12px' }}>
                {label}
            </Label>
            <div style={{ flex: 1 }}>{children}</div>
        </Row>
    )
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 10px',
    fontSize: '13px',
    border: '1px solid var(--sf-border)',
    borderRadius: 6,
    background: 'var(--sf-bg-elevated)',
    color: 'var(--sf-text)',
    outline: 'none',
}

const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none',
    cursor: 'pointer',
}

export function CostPanel() {
    const { t } = useT('calculator')
    const { activeProduct, costDraft, updateCostDraft } = useProductContext()
    const { mutate: estimate, data: breakdown, isPending, reset } = useCostEstimate()
    const [tier, setTier] = useState<Tier>(300)

    // Initialise form from context or active product
    const [form, setForm] = useState<FormState>(() => {
        const draft = costDraft ?? {}
        const product = activeProduct
        return {
            ...DEFAULT_FORM,
            productTitle: draft.productTitle ?? product?.title ?? '',
            asin: draft.asin ?? product?.asin ?? '',
            category: draft.category ?? product?.bsr_category ?? 'Electronics',
            marketplace: (draft.marketplace ?? product?.marketplace ?? 'US') as Marketplace,
            weightKg: draft.weightKg != null ? String(draft.weightKg) : '',
            lengthCm: draft.lengthCm != null ? String(draft.lengthCm) : '',
            widthCm: draft.widthCm != null ? String(draft.widthCm) : '',
            heightCm: draft.heightCm != null ? String(draft.heightCm) : '',
            supplierPriceUSD: draft.supplierPriceUSD != null ? String(draft.supplierPriceUSD) : '',
            moq: draft.moq != null ? String(draft.moq) : String(tier),
            shippingMethod: (draft.shippingMethod ?? 'sea') as ShippingMethod,
            targetSellPrice: draft.targetSellPrice != null ? String(draft.targetSellPrice) : '',
        }
    })

    function set(key: keyof FormState, value: string) {
        setForm(prev => ({ ...prev, [key]: value }))
    }

    // Debounced auto-calculate
    const debouncedForm = useDebounce(form, 300)
    const debouncedTier = useDebounce(tier, 300)

    useEffect(() => {
        const input = formToInput(debouncedForm, debouncedTier)
        if (input) estimate(input)
    }, [debouncedForm, debouncedTier])

    // Persist draft to context on every change
    useEffect(() => {
        updateCostDraft({
            productTitle: form.productTitle || undefined,
            asin: form.asin || undefined,
            category: form.category || undefined,
            marketplace: form.marketplace,
            weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
            lengthCm: form.lengthCm ? parseFloat(form.lengthCm) : undefined,
            widthCm: form.widthCm ? parseFloat(form.widthCm) : undefined,
            heightCm: form.heightCm ? parseFloat(form.heightCm) : undefined,
            supplierPriceUSD: form.supplierPriceUSD ? parseFloat(form.supplierPriceUSD) : undefined,
            moq: form.moq ? parseInt(form.moq) : undefined,
            shippingMethod: form.shippingMethod,
            targetSellPrice: form.targetSellPrice ? parseFloat(form.targetSellPrice) : undefined,
            selectedTier: tier,
        })
    }, [form, tier])

    function handleReset() {
        setForm(DEFAULT_FORM)
        reset()
    }

    const tl = breakdown ? trafficLight(breakdown.projectedMarginPct) : null

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
            {/* ── LEFT: Inputs ── */}
            <SilkCard variant="default" padding="lg">
                <Stack gap="lg">
                    <Row gap="sm" align="center">
                        <Heading style={{ fontSize: '16px' }}>{t('title')}</Heading>
                        {isPending && (
                            <Caption style={{ color: 'var(--sf-text-muted)', fontSize: '11px' }}>
                                calculating…
                            </Caption>
                        )}
                    </Row>

                    {/* Product info */}
                    <Stack gap="sm">
                        <Caption style={{ textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.08em', color: 'var(--sf-text-muted)' }}>
                            {t('sections.product')}
                        </Caption>
                        <FieldRow label={t('fields.productTitle')}>
                            <input
                                style={inputStyle}
                                value={form.productTitle}
                                onChange={e => set('productTitle', e.target.value)}
                                placeholder="Optional"
                            />
                        </FieldRow>
                        <FieldRow label="ASIN">
                            <input
                                style={inputStyle}
                                value={form.asin}
                                onChange={e => set('asin', e.target.value)}
                                placeholder="B0..."
                            />
                        </FieldRow>
                        <FieldRow label={t('fields.category')}>
                            <input
                                style={inputStyle}
                                value={form.category}
                                onChange={e => set('category', e.target.value)}
                                placeholder="e.g. Electronics"
                            />
                        </FieldRow>
                        <FieldRow label="Marketplace">
                            <select
                                style={selectStyle}
                                value={form.marketplace}
                                onChange={e => set('marketplace', e.target.value as Marketplace)}
                            >
                                {(['US', 'UK', 'DE', 'FR', 'IT', 'ES', 'CA', 'JP'] as Marketplace[]).map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </FieldRow>
                    </Stack>

                    {/* Supplier */}
                    <Stack gap="sm">
                        <Caption style={{ textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.08em', color: 'var(--sf-text-muted)' }}>
                            {t('sections.supplier')}
                        </Caption>
                        <FieldRow label={t('fields.unitCost')}>
                            <input
                                style={inputStyle}
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.supplierPriceUSD}
                                onChange={e => set('supplierPriceUSD', e.target.value)}
                                placeholder="0.00"
                            />
                        </FieldRow>

                        {/* MOQ tier switcher */}
                        <FieldRow label={t('fields.moq')}>
                            <Row gap="xs">
                                {TIERS.map(t2 => (
                                    <button
                                        key={t2}
                                        type="button"
                                        onClick={() => setTier(t2)}
                                        style={{
                                            padding: '4px 10px',
                                            fontSize: '12px',
                                            border: `1px solid ${tier === t2 ? 'var(--sf-gold)' : 'var(--sf-border)'}`,
                                            borderRadius: 6,
                                            background: tier === t2 ? 'var(--sf-gold-subtle)' : 'transparent',
                                            color: tier === t2 ? 'var(--sf-gold)' : 'var(--sf-text-muted)',
                                            cursor: 'pointer',
                                            fontWeight: tier === t2 ? 600 : 400,
                                        }}
                                    >
                                        {t2}
                                    </button>
                                ))}
                            </Row>
                        </FieldRow>
                    </Stack>

                    {/* Shipping */}
                    <Stack gap="sm">
                        <Caption style={{ textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.08em', color: 'var(--sf-text-muted)' }}>
                            {t('sections.shipping')}
                        </Caption>
                        <FieldRow label={t('fields.shippingMethod')}>
                            <select
                                style={selectStyle}
                                value={form.shippingMethod}
                                onChange={e => set('shippingMethod', e.target.value as ShippingMethod)}
                            >
                                {(['sea', 'air', 'express'] as ShippingMethod[]).map(m => (
                                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                                ))}
                            </select>
                        </FieldRow>
                        <FieldRow label="Shipping cost override (USD)">
                            <input
                                style={inputStyle}
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.shippingCostManualUSD}
                                onChange={e => set('shippingCostManualUSD', e.target.value)}
                                placeholder="Auto-calculated"
                            />
                        </FieldRow>
                    </Stack>

                    {/* Physical — collapsible */}
                    <details>
                        <summary style={{ cursor: 'pointer', fontSize: '12px', color: 'var(--sf-text-muted)', fontWeight: 600 }}>
                            {t('sections.advanced')} ▾
                        </summary>
                        <Stack gap="sm" className="mt-3">
                            <FieldRow label={t('fields.weight')}>
                                <input
                                    style={inputStyle}
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    value={form.weightKg}
                                    onChange={e => set('weightKg', e.target.value)}
                                    placeholder="kg"
                                />
                            </FieldRow>
                            <FieldRow label="Dimensions (L×W×H cm)">
                                <Row gap="xs">
                                    {(['lengthCm', 'widthCm', 'heightCm'] as const).map((dim, i) => (
                                        <input
                                            key={dim}
                                            style={{ ...inputStyle, width: 60 }}
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={form[dim]}
                                            onChange={e => set(dim, e.target.value)}
                                            placeholder={['L', 'W', 'H'][i]}
                                        />
                                    ))}
                                    <Caption style={{ color: 'var(--sf-text-muted)' }}>cm</Caption>
                                </Row>
                            </FieldRow>
                            <FieldRow label={t('fields.targetPrice')}>
                                <input
                                    style={inputStyle}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.targetSellPrice}
                                    onChange={e => set('targetSellPrice', e.target.value)}
                                    placeholder="0.00"
                                />
                            </FieldRow>
                        </Stack>
                    </details>

                    {/* Actions */}
                    <Row gap="sm">
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={<IconRefresh size={13} />}
                            onClick={handleReset}
                        >
                            {t('reset')}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={<IconShare size={13} />}
                            onClick={() => {
                                const url = new URL(window.location.href)
                                navigator.clipboard?.writeText(url.toString())
                            }}
                        >
                            {t('share')}
                        </Button>
                    </Row>
                </Stack>
            </SilkCard>

            {/* ── RIGHT: Results ── */}
            <Stack gap="md">
                {!breakdown && !isPending && (
                    <SilkCard variant="flat" padding="lg">
                        <Stack gap="sm" className="items-center text-center">
                            <IconCalculator size={32} style={{ color: 'var(--sf-text-muted)' }} />
                            <Body style={{ fontWeight: 600 }}>{t('title')}</Body>
                            <Caption style={{ color: 'var(--sf-text-muted)' }}>
                                {t('subtitle')}
                            </Caption>
                        </Stack>
                    </SilkCard>
                )}

                {breakdown && (
                    <>
                        {/* Traffic-light margin badge */}
                        {tl && (
                            <Row gap="sm" align="center">
                                <div style={{
                                    width: 12, height: 12, borderRadius: '50%',
                                    background: tl.color, flexShrink: 0,
                                }} />
                                <Body style={{ fontWeight: 600, fontSize: '14px' }}>
                                    {tl.label} margin — {formatPercent(breakdown.projectedMarginPct)}
                                </Body>
                            </Row>
                        )}

                        {/* AI margin advisor */}
                        <SilkAlert variant={tl?.variant === 'success' ? 'success' : tl?.variant === 'error' ? 'error' : 'warning'}>
                            <Caption style={{ lineHeight: 1.6 }}>
                                {marginAdvice(breakdown.projectedMarginPct)}
                            </Caption>
                        </SilkAlert>

                        <CostBreakdownPanel breakdown={breakdown} />
                    </>
                )}

                {isPending && !breakdown && (
                    <SilkCard variant="flat" padding="md">
                        <Stack gap="sm">
                            {[70, 50, 85, 60].map((w, i) => (
                                <div key={i} style={{ height: 12, width: `${w}%`, background: 'var(--sf-border)', borderRadius: 4, animation: 'pulse 2s infinite' }} />
                            ))}
                        </Stack>
                    </SilkCard>
                )}
            </Stack>
        </div>
    )
}
