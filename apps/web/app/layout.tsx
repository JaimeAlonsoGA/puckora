import '@/styles/globals.css'
import { Providers } from '@/components/providers'
import { getLocale, getMessages, getTimeZone } from 'next-intl/server'
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata = {
    title: 'Puckora: FBA Data Science',
    description: 'The smartest way to find profitable Amazon FBA products.',
}

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const locale = await getLocale()
    const messages = await getMessages()
    const timeZone = await getTimeZone()

    return (
        <html lang={locale} className={cn("font-sans", geist.variable)} suppressHydrationWarning>
            <body className="min-h-screen antialiased">
                <Providers locale={locale} messages={messages} timeZone={timeZone}>
                    {children}
                </Providers>
            </body>
        </html>
    )
}
