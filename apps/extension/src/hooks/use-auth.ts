/**
 * useAuth — reads auth state from the Zustand store.
 *
 * Must be called after Providers are mounted (which trigger hydrate()).
 */
import { useAuthStore } from '@/stores/auth.store'

export function useAuth() {
    const { session, isAuthenticated } = useAuthStore()
    return { session, isAuthenticated }
}
