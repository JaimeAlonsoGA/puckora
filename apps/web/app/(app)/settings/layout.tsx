/**
 * Settings layout — provides a scrollable content area so the settings page
 * can overflow naturally. The parent AppShell `<main>` is `overflow-hidden`
 * to support fill-viewport routes; this layout restores scroll for settings.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex-1 overflow-y-auto">
            {children}
        </div>
    )
}
