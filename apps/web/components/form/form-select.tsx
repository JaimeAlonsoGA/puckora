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
                'h-10 w-full appearance-none rounded-[var(--radius-md)] px-[var(--space-3)]',
                'bg-[color:var(--surface-input)] text-[color:var(--text-primary)]',
                'text-[length:var(--text-sm)]',
                'border transition-colors duration-[var(--transition-fast)]',
                'focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] focus:ring-offset-0',
                error
                    ? 'border-[color:var(--border-error)]'
                    : 'border-[color:var(--border-default)] hover:border-[color:var(--border-strong)]',
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
