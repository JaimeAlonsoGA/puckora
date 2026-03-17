import { cn } from '@puckora/utils'

type PageContainerProps = {
    children: React.ReactNode
    className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
    return (
        <div
            className={cn(
                'mx-auto w-full max-w-4xl px-6 py-8',
                className,
            )}
        >
            {children}
        </div>
    )
}
