'use client'

import { createContext, useContext } from 'react'

/**
 * LinkComponent contract — minimal props every link renderer must support.
 * The web app provides `next/link` via <LinkProvider>; other apps (extension,
 * tests) get a plain <a> by default.
 */
export type LinkComponent = React.ComponentType<{
    href: string
    className?: string
    children?: React.ReactNode
    [key: string]: unknown
}>

function DefaultLink({
    href,
    children,
    ...props
}: {
    href: string
    className?: string
    children?: React.ReactNode
    [key: string]: unknown
}) {
    return (
        <a href={href} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
            {children}
        </a>
    )
}

const LinkContext = createContext<LinkComponent>(DefaultLink)

export function LinkProvider({
    linkComponent,
    children,
}: {
    linkComponent: LinkComponent
    children: React.ReactNode
}) {
    return (
        <LinkContext.Provider value={linkComponent}>
            {children}
        </LinkContext.Provider>
    )
}

export function useLinkComponent(): LinkComponent {
    return useContext(LinkContext)
}
