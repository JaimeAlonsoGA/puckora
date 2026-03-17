import { cn } from '@puckora/utils'

type FormSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
    ref?: React.Ref<HTMLSelectElement>
    error?: boolean
    options: { value: string; label: string }[]
    placeholder?: string
}

export function FormSelect({ ref, error, options, placeholder, className, ...props }: FormSelectProps) {
    return (
        <select
            ref={ref}
            className={cn(
                'h-11 w-full appearance-none rounded-md px-4',
                'bg-background text-foreground',
                'text-base',
                'border transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-0',
                error
                    ? 'border-error-fg'
                    : 'border-border hover:border-border-strong',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        >
            {placeholder && (
                <option value="" disabled>
                    {placeholder}
                </option>
            )}
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    )
}
