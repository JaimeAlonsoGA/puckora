import React from 'react'
import type { AnalysisStatus } from '@repo/types'
import { useTranslation } from 'react-i18next'

export interface AnalysisStatusBarProps { status: AnalysisStatus; reviewsScraped?: number }

export function AnalysisStatusBar({ status, reviewsScraped }: AnalysisStatusBarProps) {
  const { t } = useTranslation()
  const statusKey = `competitor.status.${status}` as const

  return (
    <div className="flex items-center gap-3 p-3 bg-surface-tertiary border border-border rounded">
      {status !== 'complete' && status !== 'failed' && (
        <div className="w-4 h-4 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
      )}
      <span className="text-sm text-text-secondary">{t(statusKey, { defaultValue: status })}</span>
      {reviewsScraped !== undefined && <span className="text-xs text-text-muted">{reviewsScraped} reviews</span>}
    </div>
  )
}
