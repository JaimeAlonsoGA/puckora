import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { ExperienceLevel, BudgetRange, OnboardingAnswers } from '@repo/types'

export interface OnboardingState {
    isComplete: boolean
    isLoading: boolean
    answers: OnboardingAnswers | null
    completeOnboarding: (answers: OnboardingAnswers) => Promise<void>
}

export function useOnboarding(): OnboardingState {
    const { user } = useAuth()
    const qc = useQueryClient()

    const { data, isLoading } = useQuery({
        queryKey: ['onboarding-status', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('onboarding_completed_at, experience_level, budget_range')
                .eq('id', user!.id)
                .single()
            if (error) throw error
            return data as {
                onboarding_completed_at: string | null
                experience_level: ExperienceLevel | null
                budget_range: BudgetRange | null
            }
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
    })

    const mutation = useMutation({
        mutationFn: async (answers: OnboardingAnswers) => {
            const { error } = await supabase
                .from('profiles')
                .update({
                    experience_level: answers.experience_level,
                    budget_range: answers.budget_range,
                    onboarding_completed_at: new Date().toISOString(),
                })
                .eq('id', user!.id)
            if (error) throw error
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['onboarding-status', user?.id] })
            qc.invalidateQueries({ queryKey: ['profile', user?.id] })
        },
    })

    const isComplete = !isLoading && !!data?.onboarding_completed_at

    const answers: OnboardingAnswers | null =
        data?.experience_level && data?.budget_range
            ? { experience_level: data.experience_level, budget_range: data.budget_range }
            : null

    return {
        isComplete,
        isLoading,
        answers,
        completeOnboarding: mutation.mutateAsync,
    }
}
