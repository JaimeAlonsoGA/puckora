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
                'h-11 w-full rounded-md px-4',
                'bg-background text-foreground',
                'text-base',
                'border transition-colors',
                'placeholder:text-faint',
                'focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-0',
                error
                    ? 'border-error-fg'
                    : 'border-border hover:border-border-strong',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        />
    )
}
