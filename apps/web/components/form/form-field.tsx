import { cn } from '@puckora/utils'
import { Label } from '@/components/building-blocks/typography'
import { Caption } from '@/components/building-blocks/typography'

type FormFieldProps = {
    label: string
    htmlFor?: string
    error?: string
    description?: string
    children: React.ReactNode
    className?: string
}

export function FormField({
    label,
    htmlFor,
    error,
    description,
    children,
    className,
}: FormFieldProps) {
    return (
        <div className={cn('flex flex-col gap-[var(--space-1-5)]', className)}>
            <Label htmlFor={htmlFor}>{label}</Label>
            {description && <Caption>{description}</Caption>}
            {children}
            {error && (
                <Caption className="text-[color:var(--text-error)]" role="alert">
                    {error}
                </Caption>
            )}
        </div>
    )
}
