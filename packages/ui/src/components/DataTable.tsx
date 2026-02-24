import React, { useState } from 'react'
import { cn } from '@repo/utils'

export interface Column<T> {
    key: keyof T | string
    header: string
    render?: (row: T) => React.ReactNode
    sortable?: boolean
}

export interface DataTableProps<T> {
    columns: Column<T>[]
    data: T[]
    keyExtractor: (row: T) => string
    className?: string
    emptyMessage?: string
}

export function DataTable<T>({ columns, data, keyExtractor, className, emptyMessage = 'No data' }: DataTableProps<T>) {
    const [sortKey, setSortKey] = useState<string | null>(null)
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortDir('asc')
        }
    }

    const sorted = [...data].sort((a, b) => {
        if (!sortKey) return 0
        const av = (a as Record<string, unknown>)[sortKey]
        const bv = (b as Record<string, unknown>)[sortKey]
        if (av === bv) return 0
        const cmp = av! < bv! ? -1 : 1
        return sortDir === 'asc' ? cmp : -cmp
    })

    return (
        <div className={cn('overflow-x-auto', className)}>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border">
                        {columns.map(col => (
                            <th
                                key={String(col.key)}
                                className={cn(
                                    'py-2 px-3 text-left text-text-secondary font-medium',
                                    col.sortable && 'cursor-pointer hover:text-text-primary',
                                )}
                                onClick={() => col.sortable && handleSort(String(col.key))}
                            >
                                {col.header}
                                {sortKey === String(col.key) && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sorted.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="py-8 text-center text-text-muted">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        sorted.map(row => (
                            <tr key={keyExtractor(row)} className="border-b border-border hover:bg-surface-tertiary">
                                {columns.map(col => (
                                    <td key={String(col.key)} className="py-2 px-3 text-text-primary">
                                        {col.render
                                            ? col.render(row)
                                            : String((row as Record<string, unknown>)[String(col.key)] ?? '')}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    )
}
