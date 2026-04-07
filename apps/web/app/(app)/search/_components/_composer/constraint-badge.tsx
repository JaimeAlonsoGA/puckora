'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { type ConstraintFieldDef, type ConstraintFieldId } from '@/constants/search'

export type ConstraintEntry = { min: string; max: string }

export function ConstraintBadge({
    field,
    value,
    onChange,
    disabled,
}: {
    field: ConstraintFieldDef
    value: ConstraintEntry | undefined
    onChange: (v: ConstraintEntry) => void
    disabled?: boolean
}) {
    const t = useTranslations('search')
    const min = value?.min ?? ''
    const max = value?.max ?? ''
    const isActive = min.trim() !== '' || max.trim() !== ''

    function inputWidth(v: string, ph: string) {
        return Math.max((v !== '' ? v : ph).length, 2)
    }

    const containerCls = cn(
        'inline-flex items-center gap-0.5 rounded-md border px-2.5 py-1 text-sm transition-colors',
        isActive ? 'border-primary/60 text-foreground' : 'border-dashed border-border text-muted-foreground',
        disabled && 'pointer-events-none opacity-50',
    )
    const inputCls = 'bg-transparent text-center outline-none placeholder:text-muted-foreground/40'

    return (
        <div className={containerCls}>
            {field.prefix && <span aria-hidden="true">{field.prefix}</span>}
            <input
                type="text"
                inputMode="decimal"
                value={min}
                placeholder={field.placeholderMin}
                size={inputWidth(min, field.placeholderMin)}
                onChange={e => onChange({ min: e.target.value, max })}
                disabled={disabled}
                aria-label={`${t(field.ariaLabelKey)} min`}
                className={inputCls}
            />
            {field.suffix && <span aria-hidden="true" className="opacity-60">{field.suffix}</span>}
            <span aria-hidden="true" className="mx-1 opacity-30">–</span>
            {field.prefix && <span aria-hidden="true">{field.prefix}</span>}
            <input
                type="text"
                inputMode="decimal"
                value={max}
                placeholder={field.placeholderMax}
                size={inputWidth(max, field.placeholderMax)}
                onChange={e => onChange({ min, max: e.target.value })}
                disabled={disabled}
                aria-label={`${t(field.ariaLabelKey)} max`}
                className={inputCls}
            />
            {field.suffix && <span aria-hidden="true" className="opacity-60">{field.suffix}</span>}
        </div>
    )
}
