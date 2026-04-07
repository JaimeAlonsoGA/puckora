import { cn } from '@/lib/utils'

type FormTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    ref?: React.Ref<HTMLTextAreaElement>
    error?: boolean
}

export function FormTextarea({ ref, error, className, ...props }: FormTextareaProps) {
    return (
        <textarea
            ref={ref}
            className={cn(
                'min-h-28 w-full rounded-md px-4 py-3',
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