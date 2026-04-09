'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Sun, Moon, Settings, LogOut, BookOpen } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useTranslations } from 'next-intl'
import { createClient } from '@/integrations/supabase/client'
import { AppRoute } from '@/constants/routes'
import { useAppStore } from '@/lib/store'

type TopbarActionsProps = {
    email: string
}

export function TopbarActions({ email }: TopbarActionsProps) {
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])
    const { resolvedTheme, setTheme } = useTheme()
    const tNav = useTranslations('nav')
    const tCommon = useTranslations('common')
    const tutorialEnabled = useAppStore((s) => s.tutorialEnabled)
    const toggleTutorial = useAppStore((s) => s.toggleTutorial)

    async function signOut() {
        await supabase.auth.signOut()
        router.push(AppRoute.login)
    }

    return (
        <div className="flex shrink-0 items-center gap-2">
            {/* Tutorial toggle */}
            <button
                onClick={toggleTutorial}
                className={`flex size-6.5 items-center justify-center rounded-md transition-colors cursor-pointer ${tutorialEnabled
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                aria-label="Toggle tutorial explanations"
                title={tutorialEnabled ? 'Disable tutorial' : 'Enable tutorial'}
            >
                <BookOpen size={13} aria-hidden="true" />
            </button>

            {/* Theme toggle */}
            <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="flex size-6.5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                aria-label="Toggle theme"
            >
                <Sun size={13} aria-hidden="true" className="hidden dark:block" />
                <Moon size={13} aria-hidden="true" className="block dark:hidden" />
            </button>

            {/* Avatar — click to open user menu */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button
                        title={email}
                        className="shrink-0 size-6.5 rounded-full bg-card border-hairline transition-opacity data-[state=open]:opacity-70 hover:opacity-70 cursor-pointer outline-none"
                        aria-label="User menu"
                    />
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        align="end"
                        sideOffset={6}
                        className="z-50 min-w-40 overflow-hidden rounded-md border-hairline bg-background p-1 shadow-md outline-none"
                    >
                        <DropdownMenu.Item
                            onSelect={() => router.push(AppRoute.settings)}
                            className="flex cursor-pointer select-none items-center gap-2 rounded px-2.5 py-1.5 text-sm text-foreground outline-none hover:bg-accent focus:bg-accent"
                        >
                            <Settings size={13} aria-hidden="true" className="text-muted-foreground" />
                            {tNav('settings')}
                        </DropdownMenu.Item>

                        <DropdownMenu.Separator className="my-1 h-px bg-border" />

                        <DropdownMenu.Item
                            onSelect={signOut}
                            className="flex cursor-pointer select-none items-center gap-2 rounded px-2.5 py-1.5 text-sm text-foreground outline-none hover:bg-accent focus:bg-accent"
                        >
                            <LogOut size={13} aria-hidden="true" className="text-muted-foreground" />
                            {tCommon('signOut')}
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
        </div>
    )
}
