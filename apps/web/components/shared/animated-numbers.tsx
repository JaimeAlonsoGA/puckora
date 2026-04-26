'use client'

import { useEffect, useRef, useState } from 'react'
import { Caption, Mono } from '@puckora/ui'
import { cn } from '@/lib/utils'

const VALUE_TRANSITION_CLASS_NAME = 'transition-[transform,opacity,width] duration-500 ease-out motion-reduce:transition-none'

function usePrefersReducedMotion() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        const apply = () => setPrefersReducedMotion(mediaQuery.matches)

        apply()
        mediaQuery.addEventListener('change', apply)

        return () => mediaQuery.removeEventListener('change', apply)
    }, [])

    return prefersReducedMotion
}

function useAnimatedNumber(target: number | null | undefined, duration = 450) {
    const prefersReducedMotion = usePrefersReducedMotion()
    const normalizedTarget = target ?? null
    const [displayValue, setDisplayValue] = useState<number | null>(normalizedTarget)
    const frameRef = useRef<number | null>(null)
    const currentValueRef = useRef<number | null>(normalizedTarget)

    useEffect(() => {
        currentValueRef.current = displayValue
    }, [displayValue])

    useEffect(() => {
        if (frameRef.current != null) {
            cancelAnimationFrame(frameRef.current)
            frameRef.current = null
        }

        if (normalizedTarget == null) {
            setDisplayValue(null)
            currentValueRef.current = null
            return
        }

        const startValue = currentValueRef.current
        if (prefersReducedMotion || startValue == null || Math.abs(startValue - normalizedTarget) < 0.001) {
            setDisplayValue(normalizedTarget)
            currentValueRef.current = normalizedTarget
            return
        }

        const startedAt = performance.now()
        const delta = normalizedTarget - startValue

        const tick = (now: number) => {
            const progress = Math.min(1, (now - startedAt) / duration)
            const eased = 1 - Math.pow(1 - progress, 3)
            const nextValue = startValue + delta * eased
            currentValueRef.current = nextValue
            setDisplayValue(nextValue)

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(tick)
                return
            }

            frameRef.current = null
            currentValueRef.current = normalizedTarget
            setDisplayValue(normalizedTarget)
        }

        frameRef.current = requestAnimationFrame(tick)

        return () => {
            if (frameRef.current != null) {
                cancelAnimationFrame(frameRef.current)
                frameRef.current = null
            }
        }
    }, [duration, normalizedTarget, prefersReducedMotion])

    return displayValue
}

function useValuePulse(value: number | null | undefined) {
    const normalizedValue = value ?? null
    const [isPulsing, setIsPulsing] = useState(false)
    const previousValueRef = useRef<number | null | undefined>(undefined)

    useEffect(() => {
        if (previousValueRef.current === undefined) {
            previousValueRef.current = normalizedValue
            return
        }

        if (previousValueRef.current === normalizedValue) return

        previousValueRef.current = normalizedValue
        setIsPulsing(true)
        const timeoutId = window.setTimeout(() => setIsPulsing(false), 420)
        return () => window.clearTimeout(timeoutId)
    }, [normalizedValue])

    return isPulsing
}

function useAnimatedValue(
    value: number | null | undefined,
    formatter: (v: number | null | undefined) => string,
    className?: string,
) {
    const animatedValue = useAnimatedNumber(value)
    const isPulsing = useValuePulse(value)
    return {
        formattedValue: formatter(animatedValue),
        animatedClass: cn(
            VALUE_TRANSITION_CLASS_NAME,
            isPulsing && 'motion-safe:-translate-y-0.5 motion-safe:opacity-85',
            className,
        ),
    }
}

interface AnimatedMonoNumberProps {
    value: number | null | undefined
    formatter: (value: number | null | undefined) => string
    as?: 'span' | 'p'
    className?: string
}

export function AnimatedMonoNumber({ value, formatter, as = 'span', className }: AnimatedMonoNumberProps) {
    const { formattedValue, animatedClass } = useAnimatedValue(value, formatter, className)
    return <Mono as={as} className={animatedClass}>{formattedValue}</Mono>
}

interface AnimatedSpanNumberProps {
    value: number | null | undefined
    formatter: (value: number | null | undefined) => string
    className?: string
}

export function AnimatedSpanNumber({ value, formatter, className }: AnimatedSpanNumberProps) {
    const { formattedValue, animatedClass } = useAnimatedValue(value, formatter, className)
    return <span className={animatedClass}>{formattedValue}</span>
}

interface AnimatedCaptionNumberProps {
    value: number | null | undefined
    formatter: (value: number | null | undefined) => string
    className?: string
}

export function AnimatedCaptionNumber({ value, formatter, className }: AnimatedCaptionNumberProps) {
    const { formattedValue, animatedClass } = useAnimatedValue(value, formatter, className)
    return <Caption as="span" className={animatedClass}>{formattedValue}</Caption>
}

interface AnimatedBarProps {
    value: number
    className?: string
}

export function AnimatedBar({ value, className }: AnimatedBarProps) {
    const boundedValue = Math.max(0, Math.min(100, value))

    return (
        <div
            className={cn(VALUE_TRANSITION_CLASS_NAME, className)}
            style={{ width: `${boundedValue}%` }}
        />
    )
}
