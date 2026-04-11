/**
 * Search query layout — fill-viewport shell for /search/[query].
 *
 * Provides a flex column that fills the available height inside AppShell's
 * `<main>` with overflow clipped, so the two-pane view and table view can
 * each define their own internal scroll regions without fighting a parent
 * that is itself scrollable.
 *
 * Applies to: overview-view, products-view, and their loading skeletons.
 */
export default function SearchQueryLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            {children}
        </div>
    )
}
