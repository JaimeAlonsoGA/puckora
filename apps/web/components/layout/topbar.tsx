/**
 * Topbar — Server Component.
 *
 * Reads the current user on the server (React.cache deduplicates the call
 * within the same render pass) and passes the email to the client island.
 * This keeps the shell static and narrows the client boundary to sign-out only.
 */
import { getAuthUser } from '@/server/auth'
import { TopbarActions } from './_components/topbar-actions'

export async function Topbar() {
    const user = await getAuthUser()

    return (
        <header
            className={[
                'flex h-[var(--topbar-height)] min-h-[var(--topbar-height)] items-center justify-end',
                'border-b border-[color:var(--border-subtle)]',
                'bg-[color:var(--surface-base)]',
                'px-[var(--space-6)]',
            ].join(' ')}
        >
            <TopbarActions email={user.email ?? ''} />
        </header>
    )
}
