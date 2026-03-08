export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[color:var(--surface-base)]">
            <div className="w-full max-w-md px-[var(--space-6)]">{children}</div>
        </div>
    )
}
