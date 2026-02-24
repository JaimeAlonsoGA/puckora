import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PlanType } from '@repo/types'
import { PLAN_LIMITS } from '@repo/types'
import { useAuth } from './useAuth'

export function usePlan() {
    const { user } = useAuth()

    const { data: profile } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('plan')
                .eq('id', user!.id)
                .single()
            if (error) throw error
            return data as { plan: PlanType }
        },
        enabled: !!user,
    })

    const plan: PlanType = profile?.plan ?? 'free'
    const limits = PLAN_LIMITS[plan]

    return { plan, limits }
}
