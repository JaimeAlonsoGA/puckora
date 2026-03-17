import { cn } from '@puckora/utils'
import { Label, Caption } from '@puckora/ui'

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
        <div className={cn('flex flex-col gap-1.5', className)}>
            <Label htmlFor={htmlFor}>{label}</Label>
            {description && <Caption>{description}</Caption>}
            {children}
            {error && (
                <Caption className="text-error-fg" role="alert">
                    {error}
                </Caption>
            )}
        </div>
    )
}
