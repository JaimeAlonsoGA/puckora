'use client'

import type { ReactNode } from 'react'
import { Button } from '@puckora/ui'
import { cn } from '@puckora/utils'

interface CardViewToggleOption<T extends string> {
    value: T
    icon: ReactNode
}

interface CardViewToggleProps<T extends string> {
    options: readonly CardViewToggleOption<T>[]
    value: T
    onChange: (nextValue: T) => void
}

export function CardViewToggle<T extends string>({ options, value, onChange }: CardViewToggleProps<T>) {
    return (
        <div className="flex items-center gap-0.5">
            {options.map((option) => (
                <Button
                    key={option.value}
                    variant="ghost"
                    size="sm"
                    className={cn('h-6 w-6 p-0', value === option.value && 'bg-accent text-accent-foreground')}
                    onClick={() => onChange(option.value)}
                >
                    {option.icon}
                </Button>
            ))}
        </div>
    )
}