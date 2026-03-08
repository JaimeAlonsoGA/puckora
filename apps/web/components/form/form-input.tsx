import { cn } from '@puckora/utils'

type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    ref?: React.Ref<HTMLInputElement>
    error?: boolean
}

export function FormInput({ ref, error, className, ...props }: FormInputProps) {
    return (
        <input
            ref={ref}
            className={cn(
                'h-10 w-full rounded-[var(--radius-md)] px-[var(--space-3)]',
                'bg-[color:var(--surface-input)] text-[color:var(--text-primary)]',
                'text-[length:var(--text-sm)]',
                'border transition-colors duration-[var(--transition-fast)]',
                'placeholder:text-[color:var(--text-tertiary)]',
                'focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] focus:ring-offset-0',
                error
                    ? 'border-[color:var(--border-error)]'
                    : 'border-[color:var(--border-default)] hover:border-[color:var(--border-strong)]',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        />
    )
}
