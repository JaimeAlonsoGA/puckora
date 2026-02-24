import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useT } from '@/hooks/useT'
import { useOnboarding } from '@/hooks/useOnboarding'
import { Stack } from '@/components/building-blocks/layout'
import { Heading, Body, Caption } from '@/components/building-blocks/typography'
import type { ExperienceLevel, BudgetRange } from '@repo/types'

// ---------------------------------------------------------------------------
// Option button
// ---------------------------------------------------------------------------

interface OptionBtnProps {
    label: string
    description?: string
    selected: boolean
    onClick: () => void
}

function OptionBtn({ label, description, selected, onClick }: OptionBtnProps) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '14px 16px',
                background: selected ? 'var(--sf-gold-bg)' : 'var(--sf-surface)',
                border: `2px solid ${selected ? 'var(--sf-gold)' : 'var(--sf-border)'}`,
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                transition: 'border-color 120ms, background 120ms',
                borderRadius: 0,
            }}
        >
            <span
                style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: selected ? 'var(--sf-gold)' : 'var(--sf-text)',
                }}
            >
                {label}
            </span>
            {description && (
                <span
                    style={{
                        fontSize: '12px',
                        color: 'var(--sf-text-muted)',
                        marginTop: '2px',
                    }}
                >
                    {description}
                </span>
            )}
        </button>
    )
}

// ---------------------------------------------------------------------------
// Wizard
// ---------------------------------------------------------------------------

export function OnboardingWizard() {
    const { t } = useT('onboarding')
    const navigate = useNavigate()
    const { completeOnboarding } = useOnboarding()

    const [step, setStep] = useState(0)
    const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null)
    const [budgetRange, setBudgetRange] = useState<BudgetRange | null>(null)
    const [submitting, setSubmitting] = useState(false)

    const TOTAL_STEPS = 3

    async function handleStep3Choice(destination: string) {
        if (!experienceLevel || !budgetRange) return
        setSubmitting(true)
        try {
            await completeOnboarding({ experience_level: experienceLevel, budget_range: budgetRange })
            navigate({ to: destination as never })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
            }}
        >
            <div
                style={{
                    background: 'var(--sf-surface)',
                    border: '1px solid var(--sf-border)',
                    width: '100%',
                    maxWidth: '480px',
                    padding: '36px 32px 32px',
                    position: 'relative',
                }}
            >
                {/* Step counter */}
                <div
                    style={{
                        fontSize: '11px',
                        color: 'var(--sf-text-muted)',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        marginBottom: '20px',
                    }}
                >
                    {t('step', { current: step + 1, total: TOTAL_STEPS })}
                </div>

                {/* Step 1 — Experience */}
                {step === 0 && (
                    <Stack gap="lg">
                        <Heading>{t('step1.question')}</Heading>
                        <Stack gap="sm">
                            <OptionBtn
                                label={t('step1.beginner')}
                                description={t('step1.beginnerDesc')}
                                selected={experienceLevel === 'beginner'}
                                onClick={() => setExperienceLevel('beginner')}
                            />
                            <OptionBtn
                                label={t('step1.researching')}
                                description={t('step1.researchingDesc')}
                                selected={experienceLevel === 'researching'}
                                onClick={() => setExperienceLevel('researching')}
                            />
                            <OptionBtn
                                label={t('step1.launched')}
                                description={t('step1.launchedDesc')}
                                selected={experienceLevel === 'launched'}
                                onClick={() => setExperienceLevel('launched')}
                            />
                        </Stack>
                        <button
                            onClick={() => setStep(1)}
                            disabled={!experienceLevel}
                            style={{
                                padding: '12px 24px',
                                background: experienceLevel ? 'var(--sf-gold)' : 'var(--sf-border)',
                                color: experienceLevel ? 'var(--sf-bg)' : 'var(--sf-text-muted)',
                                border: 'none',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: experienceLevel ? 'pointer' : 'not-allowed',
                                alignSelf: 'flex-end',
                                borderRadius: 0,
                                letterSpacing: '0.02em',
                            }}
                        >
                            {t('next')} →
                        </button>
                    </Stack>
                )}

                {/* Step 2 — Budget */}
                {step === 1 && (
                    <Stack gap="lg">
                        <Heading>{t('step2.question')}</Heading>
                        <Stack gap="sm">
                            <OptionBtn
                                label={t('step2.under1k')}
                                description={t('step2.under1kDesc')}
                                selected={budgetRange === 'under_1k'}
                                onClick={() => setBudgetRange('under_1k')}
                            />
                            <OptionBtn
                                label={t('step2.1k3k')}
                                description={t('step2.1k3kDesc')}
                                selected={budgetRange === '1k_3k'}
                                onClick={() => setBudgetRange('1k_3k')}
                            />
                            <OptionBtn
                                label={t('step2.3k10k')}
                                description={t('step2.3k10kDesc')}
                                selected={budgetRange === '3k_10k'}
                                onClick={() => setBudgetRange('3k_10k')}
                            />
                            <OptionBtn
                                label={t('step2.over10k')}
                                description={t('step2.over10kDesc')}
                                selected={budgetRange === 'over_10k'}
                                onClick={() => setBudgetRange('over_10k')}
                            />
                        </Stack>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <button
                                onClick={() => setStep(0)}
                                style={{
                                    padding: '12px 24px',
                                    background: 'transparent',
                                    color: 'var(--sf-text-muted)',
                                    border: '1px solid var(--sf-border)',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    borderRadius: 0,
                                }}
                            >
                                ← {t('back')}
                            </button>
                            <button
                                onClick={() => setStep(2)}
                                disabled={!budgetRange}
                                style={{
                                    padding: '12px 24px',
                                    background: budgetRange ? 'var(--sf-gold)' : 'var(--sf-border)',
                                    color: budgetRange ? 'var(--sf-bg)' : 'var(--sf-text-muted)',
                                    border: 'none',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: budgetRange ? 'pointer' : 'not-allowed',
                                    borderRadius: 0,
                                    letterSpacing: '0.02em',
                                }}
                            >
                                {t('next')} →
                            </button>
                        </div>
                    </Stack>
                )}

                {/* Step 3 — First action */}
                {step === 2 && (
                    <Stack gap="lg">
                        <Heading>{t('step3.question')}</Heading>
                        <Stack gap="sm">
                            <OptionBtn
                                label={t('step3.discover')}
                                description={t('step3.discoverDesc')}
                                selected={false}
                                onClick={() => handleStep3Choice('/discover')}
                            />
                            <OptionBtn
                                label={t('step3.research')}
                                description={t('step3.researchDesc')}
                                selected={false}
                                onClick={() => handleStep3Choice('/research')}
                            />
                            <OptionBtn
                                label={t('step3.calculate')}
                                description={t('step3.calculateDesc')}
                                selected={false}
                                onClick={() => handleStep3Choice('/cost-calculator')}
                            />
                            <OptionBtn
                                label={t('step3.trending')}
                                description={t('step3.trendingDesc')}
                                selected={false}
                                onClick={() => handleStep3Choice('/discover')}
                            />
                        </Stack>
                        {submitting && (
                            <Caption style={{ color: 'var(--sf-text-muted)' }}>
                                Setting up your workspace…
                            </Caption>
                        )}
                        <button
                            onClick={() => setStep(1)}
                            disabled={submitting}
                            style={{
                                alignSelf: 'flex-start',
                                padding: '10px 20px',
                                background: 'transparent',
                                color: 'var(--sf-text-muted)',
                                border: '1px solid var(--sf-border)',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                borderRadius: 0,
                            }}
                        >
                            ← {t('back')}
                        </button>
                    </Stack>
                )}
            </div>
        </div>
    )
}
