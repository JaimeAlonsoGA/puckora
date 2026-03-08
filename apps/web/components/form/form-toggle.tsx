'use client'

import { cn } from '@puckora/utils'
import { Label } from '@/components/building-blocks/typography'

type FormToggleProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
    ref?: React.Ref<HTMLInputElement>
    label?: string
}

export function FormToggle({ ref, label, className, ...props }: FormToggleProps) {
    return (
        <label className={cn('inline-flex cursor-pointer items-center gap-[var(--space-3)]', className)}>
            <div className="relative">
                <input ref={ref} type="checkbox" className="peer sr-only" {...props} />
                <div
                    className={cn(
                        'h-6 w-11 rounded-full',
                        'bg-[color:var(--surface-active)]',
                        'peer-checked:bg-[color:var(--brand-primary)]',
                        'transition-colors duration-[var(--transition-fast)]',
                        'after:absolute after:left-[2px] after:top-[2px]',
                        'after:h-5 after:w-5 after:rounded-full',
                        'after:bg-white after:transition-transform after:duration-[var(--transition-fast)]',
                        'after:content-[""]',
                        'peer-checked:after:translate-x-5',
                    )}
                />
            </div>
            {label && <Label>{label}</Label>}
        </label>
    )
}
