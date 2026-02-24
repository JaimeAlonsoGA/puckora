import React from 'react'
import { cn } from '@repo/utils'
import { FormInput } from '@/components/form/FormInput'
import { Button } from '@/components/building-blocks/Button'
import { IconSearch } from '@tabler/icons-react'
import { useT, useCommonT } from '@/hooks/useT'

export interface SearchBarProps {
    value: string
    onChange: (value: string) => void
    onSearch: () => void
    loading?: boolean
    className?: string
}

export function SearchBar({ value, onChange, onSearch, loading, className }: SearchBarProps) {
    const { t } = useT('research')
    const { t: tCommon } = useCommonT()

    return (
        <div className={cn('flex gap-2', className)}>
            <FormInput
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={t('searchPlaceholder')}
                onKeyDown={e => e.key === 'Enter' && onSearch()}
                className="flex-1"
            />
            <Button icon={<IconSearch />} onClick={onSearch} loading={loading}>
                {tCommon('search')}
            </Button>
        </div>
    )
}
