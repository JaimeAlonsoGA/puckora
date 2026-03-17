/**
 * Popup App — routes between AuthGate and Dashboard based on session state.
 */
import { useAuthStore } from '@/stores/auth.store'
import { AuthGate } from './screens/auth-gate'
import { Dashboard } from './screens/dashboard'

export function App() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    return isAuthenticated ? <Dashboard /> : <AuthGate />
}
