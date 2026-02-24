import { useState, useCallback } from 'react'
import type { ZodTypeAny } from 'zod'

type FieldErrors<T> = Partial<Record<keyof T, string>>

export interface UseFormOptions<T extends object> {
    initialValues: T
    schema?: ZodTypeAny
    onSubmit: (values: T) => void | Promise<void>
}

export function useForm<T extends object>({ initialValues, schema, onSubmit }: UseFormOptions<T>) {
    const [values, setValues] = useState<T>(initialValues)
    const [errors, setErrors] = useState<FieldErrors<T>>({})
    const [submitting, setSubmitting] = useState(false)

    const handleChange = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
        setValues(prev => ({ ...prev, [key]: value }))
        setErrors(prev => ({ ...prev, [key]: undefined }))
    }, [])

    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
        e?.preventDefault()

        if (schema) {
            const result = schema.safeParse(values)
            if (!result.success) {
                const fieldErrors: FieldErrors<T> = {}
                for (const issue of result.error.issues) {
                    const path = issue.path[0] as keyof T
                    if (path) fieldErrors[path] = issue.message
                }
                setErrors(fieldErrors)
                return
            }
        }

        setSubmitting(true)
        try {
            await onSubmit(values)
        } finally {
            setSubmitting(false)
        }
    }, [values, schema, onSubmit])

    const reset = useCallback(() => {
        setValues(initialValues)
        setErrors({})
    }, [initialValues])

    return { values, errors, submitting, handleChange, handleSubmit, reset }
}
