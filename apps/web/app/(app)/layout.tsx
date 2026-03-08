import { AppShell } from '@/components/layout/app-shell'

/**
 * App layout — authenticated only (proxy.ts enforces auth before this runs).
 *
 * This is intentionally data-free. Server Components that need the user's
 * profile call `getCachedProfile()` directly (React.cache deduplicates
 * within the request). Client Components that need preferences use
 * `useUserPreferences()` (TanStack Query, cached client-side).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
    return <AppShell>{children}</AppShell>
}
