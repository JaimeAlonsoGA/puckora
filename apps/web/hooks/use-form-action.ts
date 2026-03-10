'use client'

/**
 * useFormAction
 *
 * Reusable hook that bridges react-hook-form (client validation) with a
 * Next.js Server Action (server mutation / redirect).
 *
 * Pattern:
 *   1. react-hook-form + zodResolver validates fields before the network call.
 *   2. On a valid submission, the Server Action is invoked inside a transition
 *      so React tracks the pending state.
 *   3. If the action returns { error }, it is surfaced as a server-level error
 *      that the component can render below the form.
 *
 * Usage:
 *   const { form, onSubmit, serverError, isPending } = useFormAction(
 *     MySchema,
 *     myServerAction,
 *   )
 *
 *   <form onSubmit={onSubmit}>
 *     <input {...form.register('email')} />
 *     {serverError && <p>{serverError}</p>}
 *     <button disabled={isPending}>Submit</button>
 *   </form>
 */

import { useState, useTransition } from 'react'
import { useForm, type DefaultValues, type FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ZodSchema } from 'zod'

export type ActionResult = { error: string } | undefined

export function useFormAction<TValues extends FieldValues>(
    schema: ZodSchema<TValues>,
    action: (data: TValues) => Promise<ActionResult>,
    options?: {
        defaultValues?: DefaultValues<TValues>
        /**
         * Called after a successful action (no error returned, no redirect thrown).
         * Use this for mutations that update data in-place instead of redirecting.
         */
        onSuccess?: () => void
    },
) {
    const [serverError, setServerError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const form = useForm<TValues>({
        // @hookform/resolvers v5 has separate overloads for Zod v3 / v4 that
        // the base ZodSchema generic doesn't satisfy statically. Cast is safe
        // because the schema will validate correctly at runtime.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(schema as any),
        defaultValues: options?.defaultValues,
    })

    const onSubmit = form.handleSubmit((data) => {
        setServerError(null)
        startTransition(async () => {
            const result = await action(data)
            if (result?.error) {
                setServerError(result.error)
            } else {
                options?.onSuccess?.()
            }
        })
    })

    return { form, onSubmit, serverError, isPending }
}
