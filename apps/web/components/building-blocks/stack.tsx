import { cn } from '@puckora/utils'

type StackGap = 'none' | '1' | '1-5' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16'
type StackDirection = 'column' | 'row'
type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'

type StackProps = React.HTMLAttributes<HTMLDivElement> & {
    as?: React.ElementType
    gap?: StackGap
    direction?: StackDirection
    align?: StackAlign
    justify?: StackJustify
    wrap?: boolean
    fullWidth?: boolean
}

const GAP_MAP: Record<StackGap, string> = {
    none: 'gap-0',
    '1': 'gap-[var(--space-1)]',
    '1-5': 'gap-[var(--space-1-5)]',
    '2': 'gap-[var(--space-2)]',
    '3': 'gap-[var(--space-3)]',
    '4': 'gap-[var(--space-4)]',
    '5': 'gap-[var(--space-5)]',
    '6': 'gap-[var(--space-6)]',
    '8': 'gap-[var(--space-8)]',
    '10': 'gap-[var(--space-10)]',
    '12': 'gap-[var(--space-12)]',
    '16': 'gap-[var(--space-16)]',
}

const ALIGN_MAP: Record<StackAlign, string> = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline',
}

const JUSTIFY_MAP: Record<StackJustify, string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
}

export function Stack({
    as: Tag = 'div',
    gap = '4',
    direction = 'column',
    align,
    justify,
    wrap = false,
    fullWidth = false,
    className,
    children,
    ...props
}: StackProps) {
    return (
        <Tag
            className={cn(
                'flex',
                direction === 'row' ? 'flex-row' : 'flex-col',
                GAP_MAP[gap],
                align && ALIGN_MAP[align],
                justify && JUSTIFY_MAP[justify],
                wrap && 'flex-wrap',
                fullWidth && 'w-full',
                className,
            )}
            {...props}
        >
            {children}
        </Tag>
    )
}
