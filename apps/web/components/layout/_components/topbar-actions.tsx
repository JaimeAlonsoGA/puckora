'use client'

import { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Sun, Moon, Settings, LogOut } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useTranslations } from 'next-intl'
import { createClient } from '@/integrations/supabase/client'
import { AppRoute } from '@/constants/routes'

type TopbarActionsProps = {
    email: string
}

export function TopbarActions({ email }: TopbarActionsProps) {
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const tNav = useTranslations('nav')

    useEffect(() => setMounted(true), [])
    const tCommon = useTranslations('common')

    async function signOut() {
        await supabase.auth.signOut()
        router.push(AppRoute.login)
    }

    return (
        <div className="flex flex-shrink-0 items-center gap-2">
            {/* Theme toggle */}
            <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="flex size-6.5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                aria-label="Toggle theme"
            >
                {mounted && (resolvedTheme === 'dark'
                    ? <Sun size={13} aria-hidden="true" />
                    : <Moon size={13} aria-hidden="true" />)}
            </button>

            {/* Avatar — click to open user menu */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button
                        title={email}
                        className="flex-shrink-0 size-6.5 rounded-full bg-card border-hairline transition-opacity data-[state=open]:opacity-70 hover:opacity-70 cursor-pointer outline-none"
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
