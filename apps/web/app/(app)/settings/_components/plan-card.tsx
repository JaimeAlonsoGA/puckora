'use client'

import { useTranslations } from 'next-intl'
import { Subheading, Body, Caption } from '@/components/building-blocks/typography'
import { Button } from '@/components/building-blocks'
import { PlanTypeEnum } from '@puckora/types'
import type { PlanType } from '@puckora/types'
import { IconCrown } from '@tabler/icons-react'

type PlanCardProps = {
    planType: PlanType
}

export function PlanCard({ planType }: PlanCardProps) {
    const t = useTranslations('settings.plan')

    const planLabel = t(planType)

    return (
        <section className="rounded-[var(--radius-lg)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-card)] p-[var(--space-6)]">
            <div className="mb-[var(--space-5)] flex flex-col gap-[var(--space-1)]">
                <Subheading>{t('title')}</Subheading>
                <Body size="sm">{t('description')}</Body>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-[var(--space-3)]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--brand-primary-subtle)]">
                        <IconCrown size={20} className="text-[color:var(--text-brand)]" />
                    </div>
                    <div>
                        <Caption>{t('currentPlan')}</Caption>
                        <p className="text-[length:var(--text-base)] font-semibold text-[color:var(--text-primary)]">
                            {planLabel}
                        </p>
                    </div>
                </div>

                <div className="flex gap-[var(--space-2)]">
                    {planType !== PlanTypeEnum.FREE && (
                        <Button variant="secondary" size="sm">
                            {t('manageBilling')}
                        </Button>
                    )}
                    {planType !== PlanTypeEnum.AGENCY && (
                        <Button variant="outline" size="sm" icon={<IconCrown size={16} />}>
                            {t('upgradePlan')}
                        </Button>
                    )}
                </div>
            </div>
        </section>
    )
}
