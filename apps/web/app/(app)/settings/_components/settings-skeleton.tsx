export default function SettingsSkeleton() {
    return (
        <div className="mt-[var(--space-8)] flex flex-col gap-[var(--space-8)]">
            {/* Profile section */}
            <div className="h-44 animate-pulse rounded-[var(--radius-lg)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-card)]" />
            {/* Marketplace section */}
            <div className="h-32 animate-pulse rounded-[var(--radius-lg)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-card)]" />
            {/* Language section */}
            <div className="h-32 animate-pulse rounded-[var(--radius-lg)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-card)]" />
            {/* Plan section */}
            <div className="h-36 animate-pulse rounded-[var(--radius-lg)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-card)]" />
        </div>
    )
}

export { SettingsSkeleton }
