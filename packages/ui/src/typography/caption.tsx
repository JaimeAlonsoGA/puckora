import { cn } from '@puckora/utils'

type CaptionProps = React.HTMLAttributes<HTMLElement> & {
    as?: React.ElementType
}

export function Caption({ children, className, as: Tag = 'span', ...props }: CaptionProps) {
    return (
        <Tag
            className={cn(
                'font-sans font-normal leading-normal',
                'text-sm text-muted-foreground',
                className,
            )}
            {...props}
        >
            {children}
        </Tag>
    )
}
