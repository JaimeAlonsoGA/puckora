import React, { lazy, Suspense, type ComponentType } from 'react'

export interface IconProps {
    name: string
    size?: number
    className?: string
    color?: string
}

type TablerIconProps = { size?: number; className?: string; color?: string }

/**
 * Dynamic icon renderer for @tabler/icons-react.
 * Usage: <Icon name="IconSearch" size={16} />
 */
export function Icon({ name, size = 16, className, color }: IconProps) {
    const TablerIcon = lazy(async (): Promise<{ default: ComponentType<TablerIconProps> }> => {
        const icons = await import('@tabler/icons-react')
        const IconComponent = (icons as unknown as Record<string, ComponentType<TablerIconProps>>)[name]
        if (!IconComponent) {
            const Fallback: ComponentType<TablerIconProps> = () => (
                <span title={`Icon ${name} not found`} style={{ width: size, height: size, display: 'inline-block' }} />
            )
            return { default: Fallback }
        }
        return { default: IconComponent }
    })

    return (
        <Suspense fallback={<span style={{ width: size, height: size, display: 'inline-block' }} />}>
            <TablerIcon size={size} className={className} color={color} />
        </Suspense>
    )
}
