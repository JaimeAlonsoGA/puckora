/**
 * Button — app-level action component.
 *
 * This is the building-block Button that all app code must use.
 * It is a styled wrapper that delegates to SilkButton from @repo/ui,
 * ensuring a single source of truth for the button design.
 *
 * Convention (component-patterns.md):
 *   import { Button } from '@/components/building-blocks/Button'
 *
 * Variants: primary (gold fill) | secondary (surface) | ghost | danger
 */
import React from 'react'
import { SilkButton } from '@repo/ui'
import type { SilkButtonProps, SilkButtonVariant } from '@repo/ui'
import { cn } from '@repo/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps
    extends Omit<SilkButtonProps, 'variant' | 'size'> {
    variant?: ButtonVariant
    size?: ButtonSize
}

// Map Button convention variants → SilkButton variants
const variantMap: Record<ButtonVariant, SilkButtonVariant> = {
    primary:   'primary',
    secondary: 'secondary',
    ghost:     'ghost',
    danger:    'danger',
}

export function Button({
    variant = 'primary',
    size = 'md',
    className,
    ...props
}: ButtonProps) {
    return (
        <SilkButton
            variant={variantMap[variant]}
            size={size}
            className={cn(className)}
            {...props}
        />
    )
}
